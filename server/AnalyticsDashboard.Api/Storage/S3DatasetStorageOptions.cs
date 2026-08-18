using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Storage;

public sealed class S3DatasetStorageOptions
{
    public const string SectionName = "DatasetStorage:S3";

    [Required]
    public string ServiceUrl { get; init; } = string.Empty;

    [Required]
    public string BucketName { get; init; } = string.Empty;

    [Required]
    public string AccessKeyId { get; init; } = string.Empty;

    [Required]
    public string SecretAccessKey { get; init; } = string.Empty;

    [Required]
    public string Region { get; init; } = "auto";
}
