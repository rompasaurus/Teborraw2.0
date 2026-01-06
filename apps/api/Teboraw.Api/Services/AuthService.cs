using Microsoft.EntityFrameworkCore;
using Teboraw.Api.DTOs;
using Teboraw.Core.Entities;
using Teboraw.Core.Interfaces;

namespace Teboraw.Api.Services;

public interface IAuthService
{
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokenAsync(string refreshToken);
    Task<User?> GetUserByIdAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly int _refreshTokenExpiryDays;

    public AuthService(IUnitOfWork unitOfWork, IJwtService jwtService, IConfiguration configuration)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _configuration = configuration;
        _refreshTokenExpiryDays = int.Parse(configuration["Jwt:RefreshTokenExpiryDays"] ?? "7");
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var users = await _unitOfWork.Users.FindAsync(u => u.Email == request.Email);
        var user = users.FirstOrDefault();

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var existingUsers = await _unitOfWork.Users.FindAsync(u => u.Email == request.Email);
        if (existingUsers.Any())
        {
            return null;
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = request.DisplayName
        };

        await _unitOfWork.Users.AddAsync(user);

        // Create default settings
        var settings = new UserSettings
        {
            UserId = user.Id
        };
        await _unitOfWork.UserSettings.AddAsync(settings);

        await _unitOfWork.SaveChangesAsync();

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var tokens = await _unitOfWork.RefreshTokens.FindAsync(t =>
            t.Token == refreshToken && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow);

        var token = tokens.FirstOrDefault();
        if (token == null)
        {
            return null;
        }

        var user = await _unitOfWork.Users.GetByIdAsync(token.UserId);
        if (user == null)
        {
            return null;
        }

        // Revoke old token
        token.IsRevoked = true;
        await _unitOfWork.RefreshTokens.UpdateAsync(token);
        await _unitOfWork.SaveChangesAsync();

        return await GenerateAuthResponseAsync(user);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var tokens = await _unitOfWork.RefreshTokens.FindAsync(t => t.Token == refreshToken);
        var token = tokens.FirstOrDefault();

        if (token != null)
        {
            token.IsRevoked = true;
            await _unitOfWork.RefreshTokens.UpdateAsync(token);
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _unitOfWork.Users.GetByIdAsync(userId);
    }

    private async Task<AuthResponse> GenerateAuthResponseAsync(User user)
    {
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        var expiresAt = _jwtService.GetAccessTokenExpiry();

        var refreshTokenEntity = new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays)
        };

        await _unitOfWork.RefreshTokens.AddAsync(refreshTokenEntity);
        await _unitOfWork.SaveChangesAsync();

        return new AuthResponse(
            accessToken,
            refreshToken,
            expiresAt,
            new UserDto(user.Id, user.Email, user.DisplayName, user.AvatarUrl, user.CreatedAt)
        );
    }
}
