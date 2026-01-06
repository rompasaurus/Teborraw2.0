using System.ComponentModel.DataAnnotations;
using Teboraw.Core.Entities;

namespace Teboraw.Api.DTOs;

public record CreateActivityRequest(
    [Required] ActivityType Type,
    [Required] ActivitySource Source,
    DateTime? Timestamp,
    Dictionary<string, object>? Data
);

public record ActivityDto(
    Guid Id,
    ActivityType Type,
    ActivitySource Source,
    DateTime Timestamp,
    object? Data,
    DateTime CreatedAt
);

public record ActivityFilterRequest(
    ActivitySource[]? Sources,
    ActivityType[]? Types,
    DateTime? StartDate,
    DateTime? EndDate,
    string? SearchQuery,
    int Page = 1,
    int PageSize = 50
);

public record PaginatedResponse<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// Desktop activity DTOs
public record CreateDesktopSessionRequest(
    [Required] string AppName,
    [Required] string WindowTitle,
    DateTime StartTime,
    DateTime? EndTime
);

public record DesktopSessionDto(
    Guid Id,
    string AppName,
    string WindowTitle,
    int DurationSeconds,
    DateTime StartTime,
    DateTime? EndTime
);

// Browser activity DTOs
public record CreatePageVisitRequest(
    [Required] string Url,
    [Required] string Title,
    DateTime VisitedAt,
    int? DurationSeconds
);

public record PageVisitDto(
    Guid Id,
    string Url,
    string Title,
    string Domain,
    int DurationSeconds,
    DateTime VisitedAt
);

// Location DTOs
public record CreateLocationRequest(
    [Required] double Latitude,
    [Required] double Longitude,
    double Accuracy,
    double? Altitude,
    double? Speed,
    double? Heading,
    DateTime? RecordedAt
);

public record LocationDto(
    Guid Id,
    double Latitude,
    double Longitude,
    double Accuracy,
    double? Altitude,
    double? Speed,
    double? Heading,
    DateTime RecordedAt
);

// Audio DTOs
public record AudioRecordingDto(
    Guid Id,
    string FilePath,
    int DurationSeconds,
    string? Transcript,
    string TranscriptionStatus,
    DateTime RecordedAt
);

// Sync DTOs
public record SyncRequest(
    [Required] string DeviceId,
    [Required] IEnumerable<CreateActivityRequest> Activities,
    DateTime LastSyncTimestamp
);

public record SyncResponse(
    bool Success,
    int SyncedCount,
    DateTime ServerTimestamp
);
