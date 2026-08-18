using AnalyticsDashboard.Api.Auth;
using AnalyticsDashboard.Api.Contracts.Auth;
using AnalyticsDashboard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnalyticsDashboard.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService auth) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var response = await auth.RegisterAsync(request, cancellationToken);
        return response is null
            ? Conflict(new ProblemDetails { Title = "That username is already taken." })
            : StatusCode(StatusCodes.Status201Created, response);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var response = await auth.LoginAsync(request, cancellationToken);
        return response is null
            ? Unauthorized(new ProblemDetails { Title = "Username or password is incorrect." })
            : Ok(response);
    }

    [AllowAnonymous]
    [HttpGet("username-available")]
    [ProducesResponseType<UsernameAvailabilityResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UsernameAvailabilityResponse>> UsernameAvailable(
        [FromQuery] string username,
        CancellationToken cancellationToken)
    {
        var candidate = username.Trim();
        if (candidate.Length is < 3 or > 40 ||
            !char.IsAsciiLetterOrDigit(candidate[0]) ||
            candidate.Any(character =>
                !char.IsAsciiLetterOrDigit(character) &&
                character != '.' &&
                character != '_' &&
                character != '-'))
        {
            return Ok(new UsernameAvailabilityResponse(false));
        }

        var available = await auth.IsUsernameAvailableAsync(candidate, cancellationToken);
        return Ok(new UsernameAvailabilityResponse(available));
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        var user = await auth.GetUserAsync(User.GetUserId(), cancellationToken);
        return user is null ? Unauthorized() : Ok(user);
    }
}
