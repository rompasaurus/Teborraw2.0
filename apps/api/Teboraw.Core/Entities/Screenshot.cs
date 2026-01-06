namespace Teboraw.Core.Entities;

public class Screenshot : BaseEntity
{
    public required string FilePath { get; set; }
    public required string ThumbnailPath { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTime CapturedAt { get; set; }

    // Foreign key
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
}
