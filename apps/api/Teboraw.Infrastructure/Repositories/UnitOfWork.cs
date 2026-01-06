using Teboraw.Core.Entities;
using Teboraw.Core.Interfaces;
using Teboraw.Infrastructure.Data;

namespace Teboraw.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly TeborawDbContext _context;
    private bool _disposed;

    public UnitOfWork(TeborawDbContext context)
    {
        _context = context;
        Users = new Repository<User>(context);
        Activities = new Repository<Activity>(context);
        Thoughts = new Repository<Thought>(context);
        DesktopSessions = new Repository<DesktopSession>(context);
        Screenshots = new Repository<Screenshot>(context);
        PageVisits = new Repository<PageVisit>(context);
        SearchQueries = new Repository<SearchQuery>(context);
        Locations = new Repository<LocationPoint>(context);
        AudioRecordings = new Repository<AudioRecording>(context);
        UserSettings = new Repository<UserSettings>(context);
        RefreshTokens = new Repository<RefreshToken>(context);
    }

    public IRepository<User> Users { get; }
    public IRepository<Activity> Activities { get; }
    public IRepository<Thought> Thoughts { get; }
    public IRepository<DesktopSession> DesktopSessions { get; }
    public IRepository<Screenshot> Screenshots { get; }
    public IRepository<PageVisit> PageVisits { get; }
    public IRepository<SearchQuery> SearchQueries { get; }
    public IRepository<LocationPoint> Locations { get; }
    public IRepository<AudioRecording> AudioRecordings { get; }
    public IRepository<UserSettings> UserSettings { get; }
    public IRepository<RefreshToken> RefreshTokens { get; }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            _context.Dispose();
        }
        _disposed = true;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
