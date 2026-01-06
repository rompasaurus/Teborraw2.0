using System.ComponentModel.DataAnnotations;

namespace Teboraw.Api.DTOs;

public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password
);

public record RegisterRequest(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password,
    [Required][MaxLength(100)] string DisplayName
);

public record RefreshTokenRequest(
    [Required] string RefreshToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record UserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? AvatarUrl,
    DateTime CreatedAt
);
