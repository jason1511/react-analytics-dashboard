namespace AnalyticsDashboard.Api.Data.Entities;

public sealed class Dataset
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public DatasetStatus Status { get; set; } = DatasetStatus.Pending;
    public int? RowCount { get; set; }
    public int? ColumnCount { get; set; }
    public long SizeBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public enum DatasetStatus
{
    Pending,
    Processing,
    Ready,
    Failed
}
