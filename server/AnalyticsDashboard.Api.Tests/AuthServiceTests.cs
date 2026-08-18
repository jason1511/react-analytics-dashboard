using AnalyticsDashboard.Api.Auth;
using AnalyticsDashboard.Api.Contracts.Auth;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Data.Entities;
using AnalyticsDashboard.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Xunit;

namespace AnalyticsDashboard.Api.Tests;

public sealed class AuthServiceTests
{
    [Fact]
    public async Task RegisterAndLoginAsync_ReturnAuthenticatedUser()
    {
        await using var database = CreateDatabase();
        var service = CreateService(database);

        var registered = await service.RegisterAsync(
            new RegisterRequest("  jason_leonard ", "correct horse battery staple"));
        var loggedIn = await service.LoginAsync(
            new LoginRequest("JASON_LEONARD", "correct horse battery staple"));

        Assert.NotNull(registered);
        Assert.NotNull(loggedIn);
        Assert.Equal("jason_leonard", registered.User.Username);
        Assert.Equal(registered.User.Id, loggedIn.User.Id);
        Assert.NotEmpty(loggedIn.AccessToken);
        Assert.DoesNotContain("correct horse", database.Users.Single().PasswordHash);
    }

    [Fact]
    public async Task RegisterAsync_RejectsDuplicateUsernameIgnoringCase()
    {
        await using var database = CreateDatabase();
        var service = CreateService(database);
        await service.RegisterAsync(
            new RegisterRequest("jason", "correct horse battery staple"));

        var duplicate = await service.RegisterAsync(
            new RegisterRequest("JASON", "another secure password"));

        Assert.Null(duplicate);
        Assert.Single(database.Users);
    }

    [Fact]
    public async Task LoginAsync_RejectsIncorrectPassword()
    {
        await using var database = CreateDatabase();
        var service = CreateService(database);
        await service.RegisterAsync(
            new RegisterRequest("jason", "correct horse battery staple"));

        var response = await service.LoginAsync(
            new LoginRequest("jason", "incorrect password"));

        Assert.Null(response);
    }

    [Fact]
    public async Task IsUsernameAvailableAsync_ReflectsExistingUserIgnoringCase()
    {
        await using var database = CreateDatabase();
        var service = CreateService(database);
        await service.RegisterAsync(
            new RegisterRequest("jason", "correct horse battery staple"));

        var taken = await service.IsUsernameAvailableAsync("JASON");
        var available = await service.IsUsernameAvailableAsync("leonard");

        Assert.False(taken);
        Assert.True(available);
    }

    private static AuthService CreateService(AnalyticsDbContext database)
    {
        return new AuthService(
            database,
            new PasswordHasher<AppUser>(),
            Options.Create(new JwtOptions
            {
                SigningKey = "test-only-signing-key-that-is-at-least-32-bytes"
            }),
            TimeProvider.System);
    }

    private static AnalyticsDbContext CreateDatabase()
    {
        var options = new DbContextOptionsBuilder<AnalyticsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AnalyticsDbContext(options);
    }
}
