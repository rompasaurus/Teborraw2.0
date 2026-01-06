namespace Teboraw.Core.Entities;

public enum TranscriptionStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}

public class AudioRecording : BaseEntity
{
    public required string FilePath { get; set; }
    public int DurationSeconds { get; set; }
    public string? Transcript { get; set; }
    public TranscriptionStatus TranscriptionStatus { get; set; } = TranscriptionStatus.Pending;
    public DateTime RecordedAt { get; set; }

    // Foreign key
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
}
