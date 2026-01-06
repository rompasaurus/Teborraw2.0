using Teboraw.Core.Entities;

namespace Teboraw.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<User> Users { get; }
    IRepository<Activity> Activities { get; }
    IRepository<Thought> Thoughts { get; }
    IRepository<DesktopSession> DesktopSessions { get; }
    IRepository<Screenshot> Screenshots { get; }
    IRepository<PageVisit> PageVisits { get; }
    IRepository<SearchQuery> SearchQueries { get; }
    IRepository<LocationPoint> Locations { get; }
    IRepository<AudioRecording> AudioRecordings { get; }
    IRepository<UserSettings> UserSettings { get; }
    IRepository<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
