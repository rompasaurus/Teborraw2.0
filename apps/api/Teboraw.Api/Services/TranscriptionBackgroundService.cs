using Microsoft.EntityFrameworkCore;
using Teboraw.Core.Entities;
using Teboraw.Core.Interfaces;
using Teboraw.Infrastructure.Data;

namespace Teboraw.Api.Services;

public class TranscriptionBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TranscriptionBackgroundService> _logger;
    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(30);

    public TranscriptionBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<TranscriptionBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Transcription background service starting");

        // Initial delay to let the application start up
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingTranscriptionsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Expected during shutdown
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing transcriptions");
            }

            try
            {
                await Task.Delay(_pollingInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("Transcription background service stopping");
    }

    private async Task ProcessPendingTranscriptionsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TeborawDbContext>();
        var transcriptionService = scope.ServiceProvider.GetRequiredService<ITranscriptionService>();

        // Get pending recordings, oldest first
        var pendingRecordings = await dbContext.AudioRecordings
            .Where(a => a.TranscriptionStatus == TranscriptionStatus.Pending)
            .OrderBy(a => a.RecordedAt)
            .Take(5) // Process in batches
            .ToListAsync(stoppingToken);

        if (pendingRecordings.Count == 0)
        {
            return;
        }

        _logger.LogInformation("Found {Count} pending transcriptions to process", pendingRecordings.Count);

        foreach (var recording in pendingRecordings)
        {
            if (stoppingToken.IsCancellationRequested) break;

            _logger.LogInformation("Processing transcription for recording {Id}", recording.Id);

            recording.TranscriptionStatus = TranscriptionStatus.Processing;
            await dbContext.SaveChangesAsync(stoppingToken);

            try
            {
                if (!File.Exists(recording.FilePath))
                {
                    _logger.LogWarning("Audio file not found: {FilePath}", recording.FilePath);
                    recording.TranscriptionStatus = TranscriptionStatus.Failed;
                    await dbContext.SaveChangesAsync(stoppingToken);
                    continue;
                }

                var transcript = await transcriptionService.TranscribeAsync(
                    recording.FilePath, stoppingToken);

                recording.Transcript = transcript;
                recording.TranscriptionStatus = TranscriptionStatus.Completed;

                var wordCount = string.IsNullOrEmpty(transcript) ? 0 : transcript.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
                _logger.LogInformation(
                    "Transcription completed for recording {Id}: {WordCount} words",
                    recording.Id, wordCount);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("model not available"))
            {
                _logger.LogWarning("Whisper model not available, skipping transcription for recording {Id}", recording.Id);
                // Leave as pending - will retry when model is available
                recording.TranscriptionStatus = TranscriptionStatus.Pending;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Transcription failed for recording {Id}", recording.Id);
                recording.TranscriptionStatus = TranscriptionStatus.Failed;
            }

            await dbContext.SaveChangesAsync(stoppingToken);
        }
    }
}
