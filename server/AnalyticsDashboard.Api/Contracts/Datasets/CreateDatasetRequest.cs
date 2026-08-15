using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Contracts.Datasets;

public sealed record CreateDatasetRequest(
    [property: Required, StringLength(120, MinimumLength = 1)] string Name,
    [property: Required, StringLength(255, MinimumLength = 1)] string OriginalFileName,
    [property: Range(0, long.MaxValue)] long SizeBytes);
