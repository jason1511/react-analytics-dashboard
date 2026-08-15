using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Contracts.Auth;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(320)] string Email,
    [Required, MinLength(10), MaxLength(128)] string Password);
