using AnalyticsDashboard.Api.Data.Entities;

namespace AnalyticsDashboard.Api.Contracts.Datasets;

public sealed record DatasetResponse(
    Guid Id,
    string Name,
    string OriginalFileName,
    string Status,
    int? RowCount,
    int? ColumnCount,
    long SizeBytes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static DatasetResponse FromEntity(Dataset dataset) => new(
        dataset.Id,
        dataset.Name,
        dataset.OriginalFileName,
        dataset.Status.ToString(),
        dataset.RowCount,
        dataset.ColumnCount,
        dataset.SizeBytes,
        dataset.CreatedAt,
        dataset.UpdatedAt);
}
