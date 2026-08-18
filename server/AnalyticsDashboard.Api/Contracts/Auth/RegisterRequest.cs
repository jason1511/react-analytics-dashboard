using System.ComponentModel.DataAnnotations;

namespace AnalyticsDashboard.Api.Contracts.Auth;

public sealed record RegisterRequest(
    [Required, StringLength(40, MinimumLength = 3)]
    [RegularExpression(
        @"^[A-Za-z0-9][A-Za-z0-9._-]*$",
        ErrorMessage = "Username can use letters, numbers, dots, underscores, and hyphens.")]
    string Username,
    [Required, MinLength(10), MaxLength(128)] string Password);
