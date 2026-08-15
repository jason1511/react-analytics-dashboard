using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Contracts.Datasets;

public sealed class UploadDatasetRequest
{
    [StringLength(120, MinimumLength = 1)]
    public string? Name { get; init; }

    [Required]
    public IFormFile File { get; init; } = null!;
}
