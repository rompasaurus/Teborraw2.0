namespace Teboraw.Core.Entities;

public class Thought : BaseEntity
{
    public string? Title { get; set; }
    public required string Content { get; set; }
    public string? TopicTree { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<Guid> LinkedActivityIds { get; set; } = new();

    // Foreign key
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
