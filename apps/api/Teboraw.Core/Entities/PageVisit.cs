namespace Teboraw.Core.Entities;

public class PageVisit : BaseEntity
{
    public required string Url { get; set; }
    public required string Title { get; set; }
    public required string Domain { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime VisitedAt { get; set; }

    // Foreign key
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
}
