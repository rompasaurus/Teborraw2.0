namespace Teboraw.Core.Entities;

public class LocationPoint : BaseEntity
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double Accuracy { get; set; }
    public double? Altitude { get; set; }
    public double? Speed { get; set; }
    public double? Heading { get; set; }
    public DateTime RecordedAt { get; set; }

    // Foreign key
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
}
