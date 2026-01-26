using System.ComponentModel.DataAnnotations;

namespace Teboraw.Api.DTOs;

public record CreateThoughtRequest(
    [Required][MinLength(1)] string Content,
    string? Title,
    string? TopicTree,
    List<string>? Tags,
    List<Guid>? LinkedActivityIds
);

public record UpdateThoughtRequest(
    string? Content,
    string? Title,
    string? TopicTree,
    List<string>? Tags,
    List<Guid>? LinkedActivityIds
);

public record ThoughtDto(
    Guid Id,
    string? Title,
    string Content,
    string? TopicTree,
    List<string> Tags,
    List<Guid> LinkedActivityIds,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
