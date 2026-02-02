using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Teboraw.Api.DTOs;
using Teboraw.Core.Configuration;
using Teboraw.Core.Entities;
using Teboraw.Core.Interfaces;

namespace Teboraw.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AudioController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly AudioStorageSettings _storageSettings;
    private readonly ILogger<AudioController> _logger;

    public AudioController(
        IUnitOfWork unitOfWork,
        IOptions<AudioStorageSettings> storageSettings,
        ILogger<AudioController> logger)
    {
        _unitOfWork = unitOfWork;
        _storageSettings = storageSettings.Value;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(52_428_800)] // 50MB
    public async Task<ActionResult<UploadAudioResponse>> UploadAudio(
        IFormFile file,
        [FromForm] DateTime recordedAt,
        [FromForm] int durationSeconds)
    {
        var userId = GetUserId();

        // Validate file
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file provided");
        }

        // Validate file extension
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_storageSettings.AllowedExtensions.Contains(extension))
        {
            return BadRequest($"File type not allowed. Allowed types: {string.Join(", ", _storageSettings.AllowedExtensions)}");
        }

        // Validate file size
        if (file.Length > _storageSettings.MaxFileSizeMb * 1024 * 1024)
        {
            return BadRequest($"File size exceeds maximum of {_storageSettings.MaxFileSizeMb}MB");
        }

        // Create directory structure: BasePath/userId/yyyy/MM/
        var userDir = Path.Combine(
            _storageSettings.BasePath,
            userId.ToString(),
            recordedAt.Year.ToString(),
            recordedAt.Month.ToString("D2")
        );
        Directory.CreateDirectory(userDir);

        // Generate unique filename
        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(userDir, fileName);

        // Save file
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Create Activity record
        var activity = new Activity
        {
            UserId = userId,
            Type = ActivityType.AudioRecording,
            Source = ActivitySource.Mobile,
            Timestamp = recordedAt,
            Data = JsonDocument.Parse(JsonSerializer.Serialize(new
            {
                durationSeconds,
                fileName,
                originalFileName = file.FileName,
                fileSizeBytes = file.Length
            }))
        };

        // Create AudioRecording record
        activity.AudioRecording = new AudioRecording
        {
            FilePath = filePath,
            DurationSeconds = durationSeconds,
            TranscriptionStatus = TranscriptionStatus.Pending,
            RecordedAt = recordedAt
        };

        await _unitOfWork.Activities.AddAsync(activity);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Audio uploaded for user {UserId}: {FilePath} ({Duration}s)",
            userId, filePath, durationSeconds);

        return Ok(new UploadAudioResponse(
            activity.AudioRecording.Id,
            activity.Id,
            filePath,
            durationSeconds,
            activity.AudioRecording.TranscriptionStatus.ToString(),
            recordedAt
        ));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AudioRecordingDto>> GetAudioRecording(Guid id)
    {
        var userId = GetUserId();
        var recording = await _unitOfWork.AudioRecordings.Query()
            .Include(a => a.Activity)
            .FirstOrDefaultAsync(a => a.Id == id && a.Activity.UserId == userId);

        if (recording == null)
        {
            return NotFound();
        }

        return Ok(new AudioRecordingDto(
            recording.Id,
            recording.FilePath,
            recording.DurationSeconds,
            recording.Transcript,
            recording.TranscriptionStatus.ToString(),
            recording.RecordedAt
        ));
    }

    [HttpGet("{id:guid}/stream")]
    public async Task<IActionResult> StreamAudio(Guid id)
    {
        var userId = GetUserId();
        var recording = await _unitOfWork.AudioRecordings.Query()
            .Include(a => a.Activity)
            .FirstOrDefaultAsync(a => a.Id == id && a.Activity.UserId == userId);

        if (recording == null)
        {
            return NotFound();
        }

        if (!System.IO.File.Exists(recording.FilePath))
        {
            return NotFound("Audio file not found on disk");
        }

        var stream = System.IO.File.OpenRead(recording.FilePath);
        var contentType = Path.GetExtension(recording.FilePath).ToLowerInvariant() switch
        {
            ".m4a" => "audio/mp4",
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".webm" => "audio/webm",
            ".ogg" => "audio/ogg",
            _ => "application/octet-stream"
        };

        return File(stream, contentType, enableRangeProcessing: true);
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<AudioRecordingDto>>> GetAudioRecordings(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] TranscriptionStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var query = _unitOfWork.AudioRecordings.Query()
            .Include(a => a.Activity)
            .Where(a => a.Activity.UserId == userId);

        if (startDate.HasValue)
            query = query.Where(a => a.RecordedAt >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(a => a.RecordedAt <= endDate.Value);
        if (status.HasValue)
            query = query.Where(a => a.TranscriptionStatus == status.Value);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var recordings = await query
            .OrderByDescending(a => a.RecordedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AudioRecordingDto(
                a.Id,
                a.FilePath,
                a.DurationSeconds,
                a.Transcript,
                a.TranscriptionStatus.ToString(),
                a.RecordedAt
            ))
            .ToListAsync();

        return Ok(new PaginatedResponse<AudioRecordingDto>(
            recordings,
            totalCount,
            page,
            pageSize,
            totalPages
        ));
    }

    [HttpGet("{id:guid}/transcription")]
    public async Task<ActionResult<object>> GetTranscriptionStatus(Guid id)
    {
        var userId = GetUserId();
        var recording = await _unitOfWork.AudioRecordings.Query()
            .Include(a => a.Activity)
            .FirstOrDefaultAsync(a => a.Id == id && a.Activity.UserId == userId);

        if (recording == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            audioRecordingId = recording.Id,
            status = recording.TranscriptionStatus.ToString(),
            transcript = recording.Transcript,
            recordedAt = recording.RecordedAt
        });
    }
}
