namespace AnalyticsDashboard.Api.Data.Entities;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string NormalizedUsername { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<Dataset> Datasets { get; set; } = [];
}
