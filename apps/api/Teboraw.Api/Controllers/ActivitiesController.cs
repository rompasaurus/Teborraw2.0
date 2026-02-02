using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Teboraw.Api.DTOs;
using Teboraw.Core.Entities;
using Teboraw.Core.Interfaces;

namespace Teboraw.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ActivitiesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ActivitiesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<ActivityDto>>> GetActivities([FromQuery] ActivityFilterRequest filter)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Activities.Query()
            .Where(a => a.UserId == userId);

        // Apply filters
        if (filter.Sources?.Length > 0)
        {
            query = query.Where(a => filter.Sources.Contains(a.Source));
        }

        if (filter.Types?.Length > 0)
        {
            query = query.Where(a => filter.Types.Contains(a.Type));
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= filter.EndDate.Value);
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

        var activityEntities = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        var activities = activityEntities.Select(a => new ActivityDto(
            a.Id,
            a.Type,
            a.Source,
            a.Timestamp,
            a.Data != null ? JsonSerializer.Deserialize<object>(a.Data.RootElement.GetRawText()) : null,
            a.CreatedAt
        )).ToList();

        return Ok(new PaginatedResponse<ActivityDto>(
            activities,
            totalCount,
            filter.Page,
            filter.PageSize,
            totalPages
        ));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ActivityDto>> GetActivity(Guid id)
    {
        var userId = GetUserId();
        var activity = await _unitOfWork.Activities.Query()
            .Include(a => a.DesktopSession)
            .Include(a => a.PageVisit)
            .Include(a => a.Location)
            .Include(a => a.AudioRecording)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null)
        {
            return NotFound();
        }

        return Ok(new ActivityDto(
            activity.Id,
            activity.Type,
            activity.Source,
            activity.Timestamp,
            activity.Data != null ? JsonSerializer.Deserialize<object>(activity.Data.RootElement.GetRawText()) : null,
            activity.CreatedAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<ActivityDto>> CreateActivity([FromBody] CreateActivityRequest request)
    {
        var userId = GetUserId();

        var activity = new Activity
        {
            UserId = userId,
            Type = request.Type,
            Source = request.Source,
            Timestamp = request.Timestamp ?? DateTime.UtcNow,
            Data = request.Data != null ? JsonDocument.Parse(JsonSerializer.Serialize(request.Data)) : null
        };

        await _unitOfWork.Activities.AddAsync(activity);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActivity), new { id = activity.Id }, new ActivityDto(
            activity.Id,
            activity.Type,
            activity.Source,
            activity.Timestamp,
            request.Data,
            activity.CreatedAt
        ));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteActivity(Guid id)
    {
        var userId = GetUserId();
        var activity = await _unitOfWork.Activities.Query()
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (activity == null)
        {
            return NotFound();
        }

        await _unitOfWork.Activities.DeleteAsync(activity);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private static double? GetDoubleFromDictionary(Dictionary<string, object> data, string key)
    {
        if (!data.TryGetValue(key, out var value) || value == null)
            return null;

        // Handle JsonElement (from System.Text.Json deserialization)
        if (value is JsonElement jsonElement)
        {
            if (jsonElement.ValueKind == JsonValueKind.Null)
                return null;
            if (jsonElement.TryGetDouble(out var d))
                return d;
            return null;
        }

        // Handle direct numeric types
        return Convert.ToDouble(value);
    }

    private static double? GetJsonElementDouble(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
            return null;
        if (prop.ValueKind == JsonValueKind.Null)
            return null;
        if (prop.TryGetDouble(out var value))
            return value;
        return null;
    }

    [HttpPost("sync")]
    public async Task<ActionResult<SyncResponse>> SyncActivities([FromBody] SyncRequest request)
    {
        var userId = GetUserId();
        var syncedCount = 0;

        foreach (var activityRequest in request.Activities)
        {
            var activity = new Activity
            {
                UserId = userId,
                Type = activityRequest.Type,
                Source = activityRequest.Source,
                Timestamp = activityRequest.Timestamp ?? DateTime.UtcNow,
                Data = activityRequest.Data != null ? JsonDocument.Parse(JsonSerializer.Serialize(activityRequest.Data)) : null
            };

            // If this is a Location activity, also create the LocationPoint entity for better querying
            if (activityRequest.Type == ActivityType.Location && activityRequest.Data != null)
            {
                try
                {
                    var data = activityRequest.Data;
                    activity.Location = new LocationPoint
                    {
                        Latitude = GetDoubleFromDictionary(data, "latitude") ?? 0,
                        Longitude = GetDoubleFromDictionary(data, "longitude") ?? 0,
                        Accuracy = GetDoubleFromDictionary(data, "accuracy") ?? 0,
                        Altitude = GetDoubleFromDictionary(data, "altitude"),
                        Speed = GetDoubleFromDictionary(data, "speed"),
                        Heading = GetDoubleFromDictionary(data, "heading"),
                        RecordedAt = activityRequest.Timestamp ?? DateTime.UtcNow
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to create LocationPoint: {ex.Message}");
                }
            }

            // Also extract location from MotionStart/MotionStop events (location is nested under "location" key)
            if ((activityRequest.Type == ActivityType.MotionStart || activityRequest.Type == ActivityType.MotionStop) && activityRequest.Data != null)
            {
                try
                {
                    var data = activityRequest.Data;
                    if (data.TryGetValue("location", out var locationObj) && locationObj is JsonElement locationElement && locationElement.ValueKind == JsonValueKind.Object)
                    {
                        var lat = GetJsonElementDouble(locationElement, "latitude");
                        var lng = GetJsonElementDouble(locationElement, "longitude");
                        if (lat.HasValue && lng.HasValue)
                        {
                            activity.Location = new LocationPoint
                            {
                                Latitude = lat.Value,
                                Longitude = lng.Value,
                                Accuracy = GetJsonElementDouble(locationElement, "accuracy") ?? 0,
                                Altitude = GetJsonElementDouble(locationElement, "altitude"),
                                Speed = GetJsonElementDouble(locationElement, "speed"),
                                Heading = GetJsonElementDouble(locationElement, "heading"),
                                RecordedAt = activityRequest.Timestamp ?? DateTime.UtcNow
                            };
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to create LocationPoint from motion event: {ex.Message}");
                }
            }

            await _unitOfWork.Activities.AddAsync(activity);
            syncedCount++;
        }

        await _unitOfWork.SaveChangesAsync();

        return Ok(new SyncResponse(
            true,
            syncedCount,
            DateTime.UtcNow
        ));
    }
}
