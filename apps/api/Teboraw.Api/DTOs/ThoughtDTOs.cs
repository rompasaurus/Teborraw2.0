using System.ComponentModel.DataAnnotations;

namespace Teboraw.Api.DTOs;

public record CreateThoughtRequest(
    [Required][MinLength(1)] string Content,
    List<string>? Tags,
    List<Guid>? LinkedActivityIds
);

public record UpdateThoughtRequest(
    string? Content,
    List<string>? Tags,
    List<Guid>? LinkedActivityIds
);

public record ThoughtDto(
    Guid Id,
    string Content,
    List<string> Tags,
    List<Guid> LinkedActivityIds,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
