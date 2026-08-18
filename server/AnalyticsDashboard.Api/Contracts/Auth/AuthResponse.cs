namespace AnalyticsDashboard.Api.Contracts.Auth;

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    UserResponse User);

public sealed record UserResponse(Guid Id, string Username);

public sealed record UsernameAvailabilityResponse(bool Available);
