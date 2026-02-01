using System.Security.Claims;
using System.Text;
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
public class LocationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public LocationsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    private static DateTime ToUtc(DateTime dt)
    {
        return dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<LocationWithDurationDto>>> GetLocations([FromQuery] LocationQueryRequest filter)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Locations.Query()
            .Include(l => l.Activity)
            .Where(l => l.Activity.UserId == userId);

        // Apply date filters
        if (filter.StartDate.HasValue)
        {
            var startUtc = ToUtc(filter.StartDate.Value);
            query = query.Where(l => l.RecordedAt >= startUtc);
        }

        if (filter.EndDate.HasValue)
        {
            var endUtc = ToUtc(filter.EndDate.Value);
            query = query.Where(l => l.RecordedAt <= endUtc);
        }

        // Apply geo bounding box filter
        if (filter.MinLatitude.HasValue)
        {
            query = query.Where(l => l.Latitude >= filter.MinLatitude.Value);
        }
        if (filter.MaxLatitude.HasValue)
        {
            query = query.Where(l => l.Latitude <= filter.MaxLatitude.Value);
        }
        if (filter.MinLongitude.HasValue)
        {
            query = query.Where(l => l.Longitude >= filter.MinLongitude.Value);
        }
        if (filter.MaxLongitude.HasValue)
        {
            query = query.Where(l => l.Longitude <= filter.MaxLongitude.Value);
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

        var locations = await query
            .OrderByDescending(l => l.RecordedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        // Calculate duration for each point (time until next point)
        var locationDtos = new List<LocationWithDurationDto>();
        for (int i = 0; i < locations.Count; i++)
        {
            var current = locations[i];
            var durationSeconds = 0;

            // Calculate duration as time until next location point
            if (i < locations.Count - 1)
            {
                var next = locations[i + 1];
                durationSeconds = (int)(current.RecordedAt - next.RecordedAt).TotalSeconds;
            }

            locationDtos.Add(new LocationWithDurationDto(
                current.Id,
                current.Latitude,
                current.Longitude,
                current.Accuracy,
                current.Altitude,
                current.Speed,
                current.Heading,
                current.RecordedAt,
                durationSeconds,
                current.ActivityId
            ));
        }

        return Ok(new PaginatedResponse<LocationWithDurationDto>(
            locationDtos,
            totalCount,
            filter.Page,
            filter.PageSize,
            totalPages
        ));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<LocationSummaryDto>> GetSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Locations.Query()
            .Include(l => l.Activity)
            .Where(l => l.Activity.UserId == userId);

        if (startDate.HasValue)
        {
            var startUtc = ToUtc(startDate.Value);
            query = query.Where(l => l.RecordedAt >= startUtc);
        }
        if (endDate.HasValue)
        {
            var endUtc = ToUtc(endDate.Value);
            query = query.Where(l => l.RecordedAt <= endUtc);
        }

        var locations = await query.OrderBy(l => l.RecordedAt).ToListAsync();

        if (!locations.Any())
        {
            return Ok(new LocationSummaryDto(0, 0, 0, null, null, null));
        }

        var totalPoints = locations.Count;
        var daysTracked = locations.Select(l => l.RecordedAt.Date).Distinct().Count();

        // Calculate total distance using Haversine formula
        double totalDistanceKm = 0;
        for (int i = 1; i < locations.Count; i++)
        {
            totalDistanceKm += CalculateHaversineDistance(
                locations[i - 1].Latitude, locations[i - 1].Longitude,
                locations[i].Latitude, locations[i].Longitude
            );
        }

        // Find most frequent location (cluster by rounding coordinates)
        var locationGroups = locations
            .GroupBy(l => (Math.Round(l.Latitude, 3), Math.Round(l.Longitude, 3)))
            .OrderByDescending(g => g.Count())
            .FirstOrDefault();

        LocationDto? mostFrequent = null;
        if (locationGroups != null)
        {
            var loc = locationGroups.First();
            mostFrequent = new LocationDto(
                loc.Id,
                loc.Latitude,
                loc.Longitude,
                loc.Accuracy,
                loc.Altitude,
                loc.Speed,
                loc.Heading,
                loc.RecordedAt
            );
        }

        return Ok(new LocationSummaryDto(
            totalPoints,
            daysTracked,
            Math.Round(totalDistanceKm, 2),
            mostFrequent,
            locations.First().RecordedAt,
            locations.Last().RecordedAt
        ));
    }

    [HttpGet("clusters")]
    public async Task<ActionResult<IEnumerable<LocationClusterDto>>> GetClusters(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int zoom = 10)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Locations.Query()
            .Include(l => l.Activity)
            .Where(l => l.Activity.UserId == userId);

        if (startDate.HasValue)
        {
            var startUtc = ToUtc(startDate.Value);
            query = query.Where(l => l.RecordedAt >= startUtc);
        }
        if (endDate.HasValue)
        {
            var endUtc = ToUtc(endDate.Value);
            query = query.Where(l => l.RecordedAt <= endUtc);
        }

        var locations = await query.OrderBy(l => l.RecordedAt).ToListAsync();

        // Adjust precision based on zoom level (higher zoom = more precision)
        var precision = Math.Max(1, Math.Min(5, zoom / 3));

        var clusters = locations
            .GroupBy(l => (
                Lat: Math.Round(l.Latitude, precision),
                Lng: Math.Round(l.Longitude, precision)
            ))
            .Select(g =>
            {
                var points = g.ToList();
                var totalDuration = 0;

                // Calculate total time spent in this cluster
                for (int i = 0; i < points.Count - 1; i++)
                {
                    totalDuration += (int)(points[i + 1].RecordedAt - points[i].RecordedAt).TotalSeconds;
                }

                return new LocationClusterDto(
                    g.Average(l => l.Latitude),
                    g.Average(l => l.Longitude),
                    g.Count(),
                    g.Min(l => l.RecordedAt),
                    g.Max(l => l.RecordedAt),
                    Math.Abs(totalDuration)
                );
            })
            .ToList();

        return Ok(clusters);
    }

    [HttpGet("heatmap")]
    public async Task<ActionResult<IEnumerable<HeatmapPointDto>>> GetHeatmap(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Locations.Query()
            .Include(l => l.Activity)
            .Where(l => l.Activity.UserId == userId);

        if (startDate.HasValue)
        {
            var startUtc = ToUtc(startDate.Value);
            query = query.Where(l => l.RecordedAt >= startUtc);
        }
        if (endDate.HasValue)
        {
            var endUtc = ToUtc(endDate.Value);
            query = query.Where(l => l.RecordedAt <= endUtc);
        }

        var locations = await query.ToListAsync();

        // Group by rounded coordinates and calculate intensity based on frequency
        var maxCount = 1.0;
        var grouped = locations
            .GroupBy(l => (Math.Round(l.Latitude, 4), Math.Round(l.Longitude, 4)))
            .Select(g => new { Lat = g.Key.Item1, Lng = g.Key.Item2, Count = g.Count() })
            .ToList();

        if (grouped.Any())
        {
            maxCount = grouped.Max(g => g.Count);
        }

        var heatmapPoints = grouped.Select(g => new HeatmapPointDto(
            g.Lat,
            g.Lng,
            g.Count / maxCount // Normalized intensity 0-1
        )).ToList();

        return Ok(heatmapPoints);
    }

    [HttpDelete]
    public async Task<ActionResult> DeleteAllLocations()
    {
        var userId = GetUserId();
        var locations = await _unitOfWork.Locations.Query()
            .Include(l => l.Activity)
            .Where(l => l.Activity.UserId == userId)
            .ToListAsync();

        foreach (var location in locations)
        {
            await _unitOfWork.Locations.DeleteAsync(location);
        }

        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("export")]
    public async Task<ActionResult> ExportLocations([FromBody] LocationExportRequest request)
    {
        var userId = GetUserId();
        var query = _unitOfWork.Locations.Query()
            .Include(l => l.Activity)
            .Where(l => l.Activity.UserId == userId);

        if (request.StartDate.HasValue)
        {
            var startUtc = ToUtc(request.StartDate.Value);
            query = query.Where(l => l.RecordedAt >= startUtc);
        }
        if (request.EndDate.HasValue)
        {
            var endUtc = ToUtc(request.EndDate.Value);
            query = query.Where(l => l.RecordedAt <= endUtc);
        }

        var locations = await query.OrderBy(l => l.RecordedAt).ToListAsync();

        return request.Format.ToLower() switch
        {
            "gpx" => ExportAsGpx(locations),
            "csv" => ExportAsCsv(locations),
            "json" => ExportAsJson(locations),
            _ => BadRequest("Invalid format. Supported formats: gpx, csv, json")
        };
    }

    private FileContentResult ExportAsGpx(List<LocationPoint> locations)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<gpx version=\"1.1\" creator=\"Teboraw\">");
        sb.AppendLine("  <trk>");
        sb.AppendLine("    <name>Teboraw Location History</name>");
        sb.AppendLine("    <trkseg>");

        foreach (var loc in locations)
        {
            sb.AppendLine($"      <trkpt lat=\"{loc.Latitude}\" lon=\"{loc.Longitude}\">");
            if (loc.Altitude.HasValue)
            {
                sb.AppendLine($"        <ele>{loc.Altitude.Value}</ele>");
            }
            sb.AppendLine($"        <time>{loc.RecordedAt:yyyy-MM-ddTHH:mm:ssZ}</time>");
            sb.AppendLine("      </trkpt>");
        }

        sb.AppendLine("    </trkseg>");
        sb.AppendLine("  </trk>");
        sb.AppendLine("</gpx>");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "application/gpx+xml", "teboraw-locations.gpx");
    }

    private FileContentResult ExportAsCsv(List<LocationPoint> locations)
    {
        var sb = new StringBuilder();
        sb.AppendLine("latitude,longitude,accuracy,altitude,speed,heading,recorded_at");

        foreach (var loc in locations)
        {
            sb.AppendLine($"{loc.Latitude},{loc.Longitude},{loc.Accuracy},{loc.Altitude ?? 0},{loc.Speed ?? 0},{loc.Heading ?? 0},{loc.RecordedAt:yyyy-MM-ddTHH:mm:ssZ}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", "teboraw-locations.csv");
    }

    private FileContentResult ExportAsJson(List<LocationPoint> locations)
    {
        var data = locations.Select(l => new
        {
            l.Latitude,
            l.Longitude,
            l.Accuracy,
            l.Altitude,
            l.Speed,
            l.Heading,
            RecordedAt = l.RecordedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
        });

        var json = System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = true
        });

        var bytes = Encoding.UTF8.GetBytes(json);
        return File(bytes, "application/json", "teboraw-locations.json");
    }

    // Haversine formula to calculate distance between two coordinates
    private static double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Earth's radius in kilometers

        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return R * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
