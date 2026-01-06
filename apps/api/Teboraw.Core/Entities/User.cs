namespace Teboraw.Core.Entities;

public class User : BaseEntity
{
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<Thought> Thoughts { get; set; } = new List<Thought>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public UserSettings? Settings { get; set; }
}
