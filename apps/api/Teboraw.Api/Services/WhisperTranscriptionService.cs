using Microsoft.Extensions.Options;
using Teboraw.Core.Configuration;
using Teboraw.Core.Interfaces;
using Whisper.net;

namespace Teboraw.Api.Services;

public class WhisperTranscriptionService : ITranscriptionService, IDisposable
{
    private readonly WhisperSettings _settings;
    private readonly ILogger<WhisperTranscriptionService> _logger;
    private WhisperProcessor? _processor;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private bool _initialized;
    private bool _modelMissing;

    public WhisperTranscriptionService(
        IOptions<WhisperSettings> settings,
        ILogger<WhisperTranscriptionService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    private async Task EnsureInitializedAsync()
    {
        if (_initialized || _modelMissing) return;

        await _lock.WaitAsync();
        try
        {
            if (_initialized || _modelMissing) return;

            if (!File.Exists(_settings.ModelPath))
            {
                _logger.LogWarning(
                    "Whisper model not found at {ModelPath}. Transcription will be skipped. " +
                    "Download the model from https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
                    _settings.ModelPath);
                _modelMissing = true;
                return;
            }

            _logger.LogInformation("Loading Whisper model from {ModelPath}", _settings.ModelPath);

            var factory = WhisperFactory.FromPath(_settings.ModelPath);
            var builder = factory.CreateBuilder();

            if (_settings.Language != "auto")
            {
                builder.WithLanguage(_settings.Language);
            }

            _processor = builder.Build();

            _initialized = true;
            _logger.LogInformation("Whisper model loaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Whisper model");
            _modelMissing = true;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string> TranscribeAsync(string audioFilePath, CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync();

        if (_processor == null || _modelMissing)
        {
            throw new InvalidOperationException("Whisper model not available. Check that the model file exists at the configured path.");
        }

        // Convert audio to 16kHz mono WAV (Whisper requirement)
        var tempWavPath = Path.GetTempFileName() + ".wav";
        try
        {
            await ConvertToWavAsync(audioFilePath, tempWavPath);

            await using var fileStream = File.OpenRead(tempWavPath);

            var segments = new List<string>();
            await foreach (var segment in _processor.ProcessAsync(fileStream, cancellationToken))
            {
                segments.Add(segment.Text);
            }

            return string.Join(" ", segments).Trim();
        }
        finally
        {
            if (File.Exists(tempWavPath))
            {
                try
                {
                    File.Delete(tempWavPath);
                }
                catch
                {
                    // Ignore cleanup errors
                }
            }
        }
    }

    private async Task ConvertToWavAsync(string inputPath, string outputPath)
    {
        // Use NAudio to convert to 16kHz mono WAV
        using var reader = new NAudio.Wave.AudioFileReader(inputPath);
        var outFormat = new NAudio.Wave.WaveFormat(16000, 16, 1);
        using var resampler = new NAudio.Wave.MediaFoundationResampler(reader, outFormat);
        resampler.ResamplerQuality = 60;
        NAudio.Wave.WaveFileWriter.CreateWaveFile(outputPath, resampler);
        await Task.CompletedTask; // Keep async signature for potential future changes
    }

    public void Dispose()
    {
        _processor?.Dispose();
        _lock.Dispose();
    }
}
