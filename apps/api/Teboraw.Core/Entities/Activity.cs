using System.Text.Json;

namespace Teboraw.Core.Entities;

public enum ActivitySource
{
    Desktop,
    Browser,
    Mobile
}

public enum ActivityType
{
    WindowFocus,
    Screenshot,
    PageVisit,
    Search,
    TabChange,
    Location,
    AudioRecording,
    Thought,
    IdleStart,
    IdleEnd,
    InputActivity
}

public class Activity : BaseEntity
{
    public ActivityType Type { get; set; }
    public ActivitySource Source { get; set; }
    public DateTime Timestamp { get; set; }
    public JsonDocument? Data { get; set; }

    // Foreign key
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Navigation properties for specific activity types
    public DesktopSession? DesktopSession { get; set; }
    public Screenshot? ScreenshotData { get; set; }
    public PageVisit? PageVisit { get; set; }
    public SearchQuery? SearchQuery { get; set; }
    public LocationPoint? Location { get; set; }
    public AudioRecording? AudioRecording { get; set; }
}
