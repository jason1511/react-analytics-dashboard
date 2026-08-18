using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Contracts.Auth;

public sealed record LoginRequest(
    [Required, MaxLength(80)] string Username,
    [Required] string Password);
