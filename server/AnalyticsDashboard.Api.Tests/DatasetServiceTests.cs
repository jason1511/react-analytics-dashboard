using AnalyticsDashboard.Api.Contracts.Datasets;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AnalyticsDashboard.Api.Tests;

public sealed class DatasetServiceTests
{
    [Fact]
    public async Task CreateAsync_PersistsNormalizedMetadata()
    {
        await using var database = CreateDatabase();
        var service = new DatasetService(database, TimeProvider.System);

        var created = await service.CreateAsync(
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

        var first = await service.CreateAsync(
            new CreateDatasetRequest("First", "first.csv", 100));
        await Task.Delay(5);
        var second = await service.CreateAsync(
            new CreateDatasetRequest("Second", "second.csv", 200));

        var result = await service.ListAsync(0, 500);

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

        var renamed = await service.RenameAsync(
            Guid.NewGuid(),
            new RenameDatasetRequest("Missing"));

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
