using AnalyticsDashboard.Api.Contracts.Datasets;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Data.Entities;
using AnalyticsDashboard.Api.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AnalyticsDashboard.Api.Services;

public sealed record DatasetDownload(Stream Content, string FileName);

public sealed class DatasetFileService(
    AnalyticsDbContext database,
    IDatasetFileStorage storage,
    CsvInspector inspector,
    IOptions<DatasetStorageOptions> options,
    TimeProvider timeProvider,
    ILogger<DatasetFileService> logger)
{
    public async Task<DatasetResponse> UploadAsync(
        Guid ownerId,
        string? requestedName,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        ValidateFile(file, options.Value.MaxFileSizeBytes);

        await using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;
        var inspection = await inspector.InspectAsync(buffer, cancellationToken);
        buffer.Position = 0;

        var storageKey = await storage.SaveAsync(buffer, cancellationToken);
        var now = timeProvider.GetUtcNow();
        var dataset = new Dataset
        {
            Id = Guid.NewGuid(),
            Name = NormalizeName(requestedName, file.FileName),
            OriginalFileName = Path.GetFileName(file.FileName),
            StorageKey = storageKey,
            Status = DatasetStatus.Ready,
            RowCount = inspection.RowCount,
            ColumnCount = inspection.ColumnCount,
            SizeBytes = file.Length,
            CreatedAt = now,
            UpdatedAt = now,
            OwnerId = ownerId
        };

        try
        {
            database.Datasets.Add(dataset);
            await database.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await storage.DeleteAsync(storageKey, CancellationToken.None);
            throw;
        }

        return DatasetResponse.FromEntity(dataset);
    }

    public async Task<DatasetDownload?> OpenAsync(
        Guid ownerId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var dataset = await database.Datasets
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == id && item.OwnerId == ownerId,
                cancellationToken);

        if (dataset?.StorageKey is null)
        {
            return null;
        }

        var content = await storage.OpenReadAsync(dataset.StorageKey, cancellationToken);
        return content is null
            ? null
            : new DatasetDownload(content, dataset.OriginalFileName);
    }

    public async Task<bool> DeleteAsync(
        Guid ownerId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var dataset = await database.Datasets
            .SingleOrDefaultAsync(
                item => item.Id == id && item.OwnerId == ownerId,
                cancellationToken);

        if (dataset is null)
        {
            return false;
        }

        database.Datasets.Remove(dataset);
        await database.SaveChangesAsync(cancellationToken);

        if (dataset.StorageKey is not null)
        {
            try
            {
                await storage.DeleteAsync(dataset.StorageKey, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(
                    exception,
                    "Dataset {DatasetId} was deleted, but stored file {StorageKey} could not be removed.",
                    dataset.Id,
                    dataset.StorageKey);
            }
        }

        return true;
    }

    private static void ValidateFile(IFormFile file, long maxFileSizeBytes)
    {
        if (file.Length == 0)
        {
            throw new InvalidDataException("Choose a non-empty CSV file.");
        }

        if (file.Length > maxFileSizeBytes)
        {
            throw new InvalidDataException(
                $"The CSV file exceeds the {maxFileSizeBytes / (1024 * 1024)} MB limit.");
        }

        if (!string.Equals(Path.GetExtension(file.FileName), ".csv", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException("Only .csv files are supported.");
        }
    }

    private static string NormalizeName(string? requestedName, string fileName)
    {
        var fallback = Path.GetFileNameWithoutExtension(fileName);
        var normalized = string.IsNullOrWhiteSpace(requestedName)
            ? fallback.Trim()
            : requestedName.Trim();

        if (normalized.Length == 0)
        {
            throw new InvalidDataException("Dataset name cannot be blank.");
        }

        return normalized.Length <= 120 ? normalized : normalized[..120];
    }
}
