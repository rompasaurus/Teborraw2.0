using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Teboraw.Api.DTOs;
using Teboraw.Core.Entities;
using Teboraw.Core.Interfaces;

namespace Teboraw.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ThoughtsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ThoughtsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<ThoughtDto>>> GetThoughts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? tag = null,
        [FromQuery] string? search = null)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Thoughts.Query()
            .Where(t => t.UserId == userId);

        if (!string.IsNullOrWhiteSpace(tag))
        {
            query = query.Where(t => t.Tags.Contains(tag));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => t.Content.Contains(search));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var thoughts = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new ThoughtDto(
                t.Id,
                t.Title,
                t.Content,
                t.TopicTree,
                t.Tags,
                t.LinkedActivityIds,
                t.CreatedAt,
                t.UpdatedAt
            ))
            .ToListAsync();

        return Ok(new PaginatedResponse<ThoughtDto>(
            thoughts,
            totalCount,
            page,
            pageSize,
            totalPages
        ));
    }

    [HttpGet("latest")]
    public async Task<ActionResult<ThoughtDto>> GetLatestThought()
    {
        var userId = GetUserId();
        var thought = await _unitOfWork.Thoughts.Query()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync();

        if (thought == null)
        {
            return NoContent();
        }

        return Ok(new ThoughtDto(
            thought.Id,
            thought.Title,
            thought.Content,
            thought.TopicTree,
            thought.Tags,
            thought.LinkedActivityIds,
            thought.CreatedAt,
            thought.UpdatedAt
        ));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ThoughtDto>> GetThought(Guid id)
    {
        var userId = GetUserId();
        var thought = await _unitOfWork.Thoughts.Query()
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (thought == null)
        {
            return NotFound();
        }

        return Ok(new ThoughtDto(
            thought.Id,
            thought.Title,
            thought.Content,
            thought.TopicTree,
            thought.Tags,
            thought.LinkedActivityIds,
            thought.CreatedAt,
            thought.UpdatedAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<ThoughtDto>> CreateThought([FromBody] CreateThoughtRequest request)
    {
        var userId = GetUserId();

        var thought = new Thought
        {
            UserId = userId,
            Title = request.Title,
            Content = request.Content,
            TopicTree = request.TopicTree,
            Tags = request.Tags ?? new List<string>(),
            LinkedActivityIds = request.LinkedActivityIds ?? new List<Guid>()
        };

        await _unitOfWork.Thoughts.AddAsync(thought);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetThought), new { id = thought.Id }, new ThoughtDto(
            thought.Id,
            thought.Title,
            thought.Content,
            thought.TopicTree,
            thought.Tags,
            thought.LinkedActivityIds,
            thought.CreatedAt,
            thought.UpdatedAt
        ));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ThoughtDto>> UpdateThought(Guid id, [FromBody] UpdateThoughtRequest request)
    {
        var userId = GetUserId();
        var thought = await _unitOfWork.Thoughts.Query()
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (thought == null)
        {
            return NotFound();
        }

        if (request.Title != null)
        {
            thought.Title = request.Title;
        }

        if (request.Content != null)
        {
            thought.Content = request.Content;
        }

        if (request.TopicTree != null)
        {
            thought.TopicTree = request.TopicTree;
        }

        if (request.Tags != null)
        {
            thought.Tags = request.Tags;
        }

        if (request.LinkedActivityIds != null)
        {
            thought.LinkedActivityIds = request.LinkedActivityIds;
        }

        await _unitOfWork.Thoughts.UpdateAsync(thought);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new ThoughtDto(
            thought.Id,
            thought.Title,
            thought.Content,
            thought.TopicTree,
            thought.Tags,
            thought.LinkedActivityIds,
            thought.CreatedAt,
            thought.UpdatedAt
        ));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteThought(Guid id)
    {
        var userId = GetUserId();
        var thought = await _unitOfWork.Thoughts.Query()
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (thought == null)
        {
            return NotFound();
        }

        await _unitOfWork.Thoughts.DeleteAsync(thought);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("tags")]
    public async Task<ActionResult<IEnumerable<string>>> GetAllTags()
    {
        var userId = GetUserId();
        var thoughts = await _unitOfWork.Thoughts.Query()
            .Where(t => t.UserId == userId)
            .ToListAsync();

        var tags = thoughts
            .SelectMany(t => t.Tags)
            .Distinct()
            .OrderBy(t => t)
            .ToList();

        return Ok(tags);
    }
}
