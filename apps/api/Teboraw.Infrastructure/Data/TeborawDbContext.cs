using Microsoft.EntityFrameworkCore;
using Teboraw.Core.Entities;

namespace Teboraw.Infrastructure.Data;

public class TeborawDbContext : DbContext
{
    public TeborawDbContext(DbContextOptions<TeborawDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<DesktopSession> DesktopSessions => Set<DesktopSession>();
    public DbSet<Screenshot> Screenshots => Set<Screenshot>();
    public DbSet<PageVisit> PageVisits => Set<PageVisit>();
    public DbSet<SearchQuery> SearchQueries => Set<SearchQuery>();
    public DbSet<LocationPoint> Locations => Set<LocationPoint>();
    public DbSet<AudioRecording> AudioRecordings => Set<AudioRecording>();
    public DbSet<Thought> Thoughts => Set<Thought>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.DisplayName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
        });

        // RefreshToken configuration
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Activity configuration
        modelBuilder.Entity<Activity>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.Timestamp });
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Source);
            entity.HasOne(e => e.User)
                .WithMany(u => u.Activities)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DesktopSession configuration
        modelBuilder.Entity<DesktopSession>(entity =>
        {
            entity.HasIndex(e => e.AppName);
            entity.Property(e => e.AppName).HasMaxLength(255);
            entity.Property(e => e.WindowTitle).HasMaxLength(500);
            entity.HasOne(e => e.Activity)
                .WithOne(a => a.DesktopSession)
                .HasForeignKey<DesktopSession>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Screenshot configuration
        modelBuilder.Entity<Screenshot>(entity =>
        {
            entity.Property(e => e.FilePath).HasMaxLength(500);
            entity.Property(e => e.ThumbnailPath).HasMaxLength(500);
            entity.HasOne(e => e.Activity)
                .WithOne(a => a.ScreenshotData)
                .HasForeignKey<Screenshot>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // PageVisit configuration
        modelBuilder.Entity<PageVisit>(entity =>
        {
            entity.HasIndex(e => e.Domain);
            entity.Property(e => e.Url).HasMaxLength(2048);
            entity.Property(e => e.Title).HasMaxLength(500);
            entity.Property(e => e.Domain).HasMaxLength(255);
            entity.HasOne(e => e.Activity)
                .WithOne(a => a.PageVisit)
                .HasForeignKey<PageVisit>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SearchQuery configuration
        modelBuilder.Entity<SearchQuery>(entity =>
        {
            entity.Property(e => e.Query).HasMaxLength(1000);
            entity.Property(e => e.Engine).HasMaxLength(100);
            entity.HasOne(e => e.Activity)
                .WithOne(a => a.SearchQuery)
                .HasForeignKey<SearchQuery>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // LocationPoint configuration
        modelBuilder.Entity<LocationPoint>(entity =>
        {
            entity.HasIndex(e => e.RecordedAt);
            entity.HasOne(e => e.Activity)
                .WithOne(a => a.Location)
                .HasForeignKey<LocationPoint>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AudioRecording configuration
        modelBuilder.Entity<AudioRecording>(entity =>
        {
            entity.Property(e => e.FilePath).HasMaxLength(500);
            entity.HasOne(e => e.Activity)
                .WithOne(a => a.AudioRecording)
                .HasForeignKey<AudioRecording>(e => e.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Thought configuration
        modelBuilder.Entity<Thought>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.User)
                .WithMany(u => u.Thoughts)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserSettings configuration
        modelBuilder.Entity<UserSettings>(entity =>
        {
            entity.HasOne(e => e.User)
                .WithOne(u => u.Settings)
                .HasForeignKey<UserSettings>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
