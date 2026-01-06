namespace Teboraw.Core.Entities;

public class RefreshToken : BaseEntity
{
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public string? ReplacedByToken { get; set; }

    // Foreign key
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
