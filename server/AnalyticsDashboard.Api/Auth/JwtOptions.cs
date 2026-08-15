namespace AnalyticsDashboard.Api.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; init; } = "AnalyticsDashboard";
    public string Audience { get; init; } = "AnalyticsDashboard.Web";
    public string SigningKey { get; init; } = string.Empty;
    public int ExpiryMinutes { get; init; } = 60;
}
