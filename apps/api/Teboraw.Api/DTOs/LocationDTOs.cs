using System.ComponentModel.DataAnnotations;

namespace Teboraw.Api.DTOs;

// Query parameters for location filtering
public record LocationQueryRequest(
    DateTime? StartDate,
    DateTime? EndDate,
    double? MinLatitude,
    double? MaxLatitude,
    double? MinLongitude,
    double? MaxLongitude,
    int Page = 1,
    int PageSize = 100
);

// Location with calculated duration at that point
public record LocationWithDurationDto(
    Guid Id,
    double Latitude,
    double Longitude,
    double Accuracy,
    double? Altitude,
    double? Speed,
    double? Heading,
    DateTime RecordedAt,
    int DurationSeconds,
    Guid ActivityId
);

// Summary statistics for location data
public record LocationSummaryDto(
    int TotalPoints,
    int DaysTracked,
    double TotalDistanceKm,
    LocationDto? MostFrequentLocation,
    DateTime? FirstRecordedAt,
    DateTime? LastRecordedAt
);

// Clustered location for efficient map rendering at low zoom
public record LocationClusterDto(
    double Latitude,
    double Longitude,
    int PointCount,
    DateTime EarliestTimestamp,
    DateTime LatestTimestamp,
    int TotalDurationSeconds
);

// Heat map data point
public record HeatmapPointDto(
    double Latitude,
    double Longitude,
    double Intensity
);

// Export request
public record LocationExportRequest(
    [Required] string Format,
    DateTime? StartDate,
    DateTime? EndDate
);
