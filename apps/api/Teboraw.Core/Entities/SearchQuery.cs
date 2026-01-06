namespace Teboraw.Core.Entities;

public class SearchQuery : BaseEntity
{
    public required string Query { get; set; }
    public required string Engine { get; set; }
    public DateTime SearchedAt { get; set; }

    // Foreign key
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
}
