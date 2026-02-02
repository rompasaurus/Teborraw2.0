namespace Teboraw.Core.Interfaces;

public interface ITranscriptionService
{
    Task<string> TranscribeAsync(string audioFilePath, CancellationToken cancellationToken = default);
}
