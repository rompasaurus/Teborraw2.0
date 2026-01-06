namespace Teboraw.Core.Entities;

public class DesktopSession : BaseEntity
{
    public required string AppName { get; set; }
    public required string WindowTitle { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Foreign key
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
}
