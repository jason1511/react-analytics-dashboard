using AnalyticsDashboard.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AnalyticsDashboard.Api.Data;

public sealed class AnalyticsDbContext(DbContextOptions<AnalyticsDbContext> options)
    : DbContext(options)
{
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<AppUser> Users => Set<AppUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var dataset = modelBuilder.Entity<Dataset>();

        dataset.ToTable("datasets");
        dataset.HasKey(item => item.Id);
        dataset.Property(item => item.Id).HasColumnName("id");
        dataset.Property(item => item.Name)
            .HasColumnName("name")
            .HasMaxLength(120)
            .IsRequired();
        dataset.Property(item => item.OriginalFileName)
            .HasColumnName("original_file_name")
            .HasMaxLength(255)
            .IsRequired();
        dataset.Property(item => item.StorageKey)
            .HasColumnName("storage_key")
            .HasMaxLength(80);
        dataset.Property(item => item.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();
        dataset.Property(item => item.RowCount).HasColumnName("row_count");
        dataset.Property(item => item.ColumnCount).HasColumnName("column_count");
        dataset.Property(item => item.SizeBytes).HasColumnName("size_bytes");
        dataset.Property(item => item.CreatedAt).HasColumnName("created_at");
        dataset.Property(item => item.UpdatedAt).HasColumnName("updated_at");
        dataset.Property(item => item.OwnerId).HasColumnName("owner_id");
        dataset.HasOne(item => item.Owner)
            .WithMany(user => user.Datasets)
            .HasForeignKey(item => item.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);
        dataset.HasIndex(item => new { item.OwnerId, item.CreatedAt })
            .HasDatabaseName("ix_datasets_owner_id_created_at");
        dataset.HasIndex(item => item.CreatedAt)
            .HasDatabaseName("ix_datasets_created_at");

        var user = modelBuilder.Entity<AppUser>();
        user.ToTable("app_users");
        user.HasKey(item => item.Id);
        user.Property(item => item.Id).HasColumnName("id");
        user.Property(item => item.Username)
            .HasColumnName("username")
            .HasMaxLength(80)
            .IsRequired();
        user.Property(item => item.NormalizedUsername)
            .HasColumnName("normalized_username")
            .HasMaxLength(80)
            .IsRequired();
        user.Property(item => item.PasswordHash)
            .HasColumnName("password_hash")
            .IsRequired();
        user.Property(item => item.CreatedAt).HasColumnName("created_at");
        user.HasIndex(item => item.NormalizedUsername)
            .IsUnique()
            .HasDatabaseName("ux_app_users_normalized_username");
    }
}
