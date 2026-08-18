using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AnalyticsDashboard.Api.Auth;
using AnalyticsDashboard.Api.Contracts.Auth;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

namespace AnalyticsDashboard.Api.Services;

public sealed class AuthService(
    AnalyticsDbContext database,
    IPasswordHasher<AppUser> passwordHasher,
    IOptions<JwtOptions> options,
    TimeProvider timeProvider)
{
    public async Task<AuthResponse?> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();
        var normalizedUsername = NormalizeUsername(username);
        if (await database.Users.AnyAsync(
                user => user.NormalizedUsername == normalizedUsername,
                cancellationToken))
        {
            return null;
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Username = username,
            NormalizedUsername = normalizedUsername,
            CreatedAt = timeProvider.GetUtcNow()
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        database.Users.Add(user);
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            database.Entry(user).State = EntityState.Detached;
            return null;
        }

        return CreateResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedUsername = NormalizeUsername(request.Username);
        var user = await database.Users.SingleOrDefaultAsync(
            item => item.NormalizedUsername == normalizedUsername,
            cancellationToken);
        if (user is null)
        {
            return null;
        }

        var verification = passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await database.SaveChangesAsync(cancellationToken);
        }

        return CreateResponse(user);
    }

    public async Task<UserResponse?> GetUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await database.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new UserResponse(user.Id, user.Username))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> IsUsernameAvailableAsync(
        string username,
        CancellationToken cancellationToken = default)
    {
        var normalizedUsername = NormalizeUsername(username);
        return !await database.Users
            .AsNoTracking()
            .AnyAsync(
                user => user.NormalizedUsername == normalizedUsername,
                cancellationToken);
    }

    private AuthResponse CreateResponse(AppUser user)
    {
        var jwt = options.Value;
        var now = timeProvider.GetUtcNow();
        var expiresAt = now.AddMinutes(jwt.ExpiryMinutes);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            jwt.Issuer,
            jwt.Audience,
            claims,
            now.UtcDateTime,
            expiresAt.UtcDateTime,
            credentials);

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt,
            new UserResponse(user.Id, user.Username));
    }

    private static string NormalizeUsername(string username) =>
        username.Trim().ToUpperInvariant();
}
