namespace AnalyticsDashboard.Api.Contracts.Auth;

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    UserResponse User);

public sealed record UserResponse(Guid Id, string Email);
