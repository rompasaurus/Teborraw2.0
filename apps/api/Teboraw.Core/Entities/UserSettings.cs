namespace Teboraw.Core.Entities;

public class UserSettings : BaseEntity
{
    // Tracking settings
    public bool DesktopTrackingEnabled { get; set; } = true;
    public bool BrowserTrackingEnabled { get; set; } = true;
    public bool LocationTrackingEnabled { get; set; } = true;
    public bool AudioTrackingEnabled { get; set; } = true;
    public int ScreenshotIntervalSeconds { get; set; } = 300; // 5 minutes
    public int LocationIntervalSeconds { get; set; } = 60; // 1 minute
    public int IdleThresholdSeconds { get; set; } = 300; // 5 minutes

    // Privacy settings
    public List<string> ExcludedApps { get; set; } = new();
    public List<string> ExcludedDomains { get; set; } = new();
    public bool BlurScreenshots { get; set; }
    public int DataRetentionDays { get; set; } = 365;

    // Notification settings
    public bool DailySummaryEnabled { get; set; } = true;
    public bool WeeklySummaryEnabled { get; set; } = true;
    public bool SyncAlertsEnabled { get; set; } = true;

    // Foreign key
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
