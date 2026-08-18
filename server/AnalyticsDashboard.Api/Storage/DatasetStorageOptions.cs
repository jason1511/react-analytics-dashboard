using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Storage;

public sealed class DatasetStorageOptions
{
    public const string SectionName = "DatasetStorage";

    [Required]
    public string Provider { get; init; } = "Local";

    [Required]
    public string Path { get; init; } = "App_Data/datasets";

    [Range(1, 100 * 1024 * 1024)]
    public long MaxFileSizeBytes { get; init; } = 10 * 1024 * 1024;
}
