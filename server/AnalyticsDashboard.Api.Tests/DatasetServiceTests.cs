using AnalyticsDashboard.Api.Contracts.Datasets;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AnalyticsDashboard.Api.Tests;

public sealed class DatasetServiceTests
{
    private static readonly Guid OwnerId = Guid.NewGuid();

    [Fact]
    public async Task CreateAsync_PersistsNormalizedMetadata()
    {
        await using var database = CreateDatabase();
        var service = new DatasetService(database, TimeProvider.System);

        var created = await service.CreateAsync(OwnerId,
            new CreateDatasetRequest("  August Sales  ", "sales.csv", 2048));

        Assert.Equal("August Sales", created.Name);
        Assert.Equal("sales.csv", created.OriginalFileName);
        Assert.Equal("Pending", created.Status);
        Assert.Equal(2048, created.SizeBytes);
        Assert.Equal(1, await database.Datasets.CountAsync());
    }

    [Fact]
    public async Task ListAsync_ClampsPageSizeAndReturnsNewestFirst()
    {
        await using var database = CreateDatabase();
        var service = new DatasetService(database, TimeProvider.System);

        var first = await service.CreateAsync(OwnerId,
            new CreateDatasetRequest("First", "first.csv", 100));
        await Task.Delay(5);
        var second = await service.CreateAsync(OwnerId,
            new CreateDatasetRequest("Second", "second.csv", 200));

        var result = await service.ListAsync(OwnerId, 0, 500);

        Assert.Equal(1, result.Page);
        Assert.Equal(100, result.PageSize);
        Assert.Equal(2, result.TotalItems);
        Assert.Equal(
            new[] { second.Id, first.Id },
            result.Items.Select(item => item.Id));
    }

    [Fact]
    public async Task RenameAsync_ReturnsNullForUnknownDataset()
    {
        await using var database = CreateDatabase();
        var service = new DatasetService(database, TimeProvider.System);

        var renamed = await service.RenameAsync(OwnerId,
            Guid.NewGuid(),
            new RenameDatasetRequest("Missing"));

        Assert.Null(renamed);
    }

    [Fact]
    public async Task ListAndRenameAsync_DoNotExposeAnotherUsersDataset()
    {
        await using var database = CreateDatabase();
        var service = new DatasetService(database, TimeProvider.System);
        var otherOwnerId = Guid.NewGuid();
        var created = await service.CreateAsync(
            otherOwnerId,
            new CreateDatasetRequest("Private", "private.csv", 100));

        var list = await service.ListAsync(OwnerId, 1, 20);
        var renamed = await service.RenameAsync(
            OwnerId,
            created.Id,
            new RenameDatasetRequest("Stolen"));

        Assert.Empty(list.Items);
        Assert.Null(renamed);
    }

    private static AnalyticsDbContext CreateDatabase()
    {
        var options = new DbContextOptionsBuilder<AnalyticsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AnalyticsDbContext(options);
    }
}
