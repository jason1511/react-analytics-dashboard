using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Contracts.Datasets;

public sealed record RenameDatasetRequest(
    [property: Required, StringLength(120, MinimumLength = 1)] string Name);
