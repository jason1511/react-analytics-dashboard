using AnalyticsDashboard.Api.Contracts;
using AnalyticsDashboard.Api.Contracts.Datasets;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AnalyticsDashboard.Api.Services;

public sealed class DatasetService(AnalyticsDbContext database, TimeProvider timeProvider)
{
    public async Task<PagedResponse<DatasetResponse>> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = database.Datasets.AsNoTracking();
        var totalItems = await query.CountAsync(cancellationToken);
        var entities = await query
            .OrderByDescending(dataset => dataset.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        var items = entities.Select(DatasetResponse.FromEntity).ToList();

        return new PagedResponse<DatasetResponse>(
            items,
            page,
            pageSize,
            totalItems,
            (int)Math.Ceiling(totalItems / (double)pageSize));
    }

    public async Task<DatasetResponse?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var dataset = await database.Datasets
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return dataset is null ? null : DatasetResponse.FromEntity(dataset);
    }

    public async Task<DatasetResponse> CreateAsync(
        CreateDatasetRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow();
        var dataset = new Dataset
        {
            Id = Guid.NewGuid(),
            Name = NormalizeName(request.Name),
            OriginalFileName = request.OriginalFileName.Trim(),
            SizeBytes = request.SizeBytes,
            Status = DatasetStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        database.Datasets.Add(dataset);
        await database.SaveChangesAsync(cancellationToken);

        return DatasetResponse.FromEntity(dataset);
    }

    public async Task<DatasetResponse?> RenameAsync(
        Guid id,
        RenameDatasetRequest request,
        CancellationToken cancellationToken = default)
    {
        var dataset = await database.Datasets
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (dataset is null)
        {
            return null;
        }

        dataset.Name = NormalizeName(request.Name);
        dataset.UpdatedAt = timeProvider.GetUtcNow();
        await database.SaveChangesAsync(cancellationToken);

        return DatasetResponse.FromEntity(dataset);
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var deleted = await database.Datasets
            .Where(item => item.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted > 0;
    }

    private static string NormalizeName(string name)
    {
        var normalized = name.Trim();
        return normalized.Length > 0
            ? normalized
            : throw new ArgumentException("Dataset name cannot be blank.", nameof(name));
    }
}
