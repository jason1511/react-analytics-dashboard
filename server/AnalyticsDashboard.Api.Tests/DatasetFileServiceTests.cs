using System.Text;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Services;
using AnalyticsDashboard.Api.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AnalyticsDashboard.Api.Tests;

public sealed class DatasetFileServiceTests
{
    [Fact]
    public async Task UploadAsync_StoresCsvAndPersistsReadyDataset()
    {
        await using var database = CreateDatabase();
        var storage = new MemoryDatasetFileStorage();
        var service = CreateService(database, storage);
        var file = CreateFile(
            "Region,Product,Revenue\nNorth,\"Bike, City\",1200\nSouth,Bike B,950\n",
            "sales.csv");

        var created = await service.UploadAsync("  August Sales  ", file);
        var download = await service.OpenAsync(created.Id);

        Assert.Equal("August Sales", created.Name);
        Assert.Equal("Ready", created.Status);
        Assert.Equal(2, created.RowCount);
        Assert.Equal(3, created.ColumnCount);
        Assert.NotNull(download);
        await using var content = download!.Content;
        using var reader = new StreamReader(content);
        Assert.Contains("Bike, City", await reader.ReadToEndAsync());
    }

    [Fact]
    public async Task UploadAsync_RejectsDuplicateHeadersWithoutSavingAnything()
    {
        await using var database = CreateDatabase();
        var storage = new MemoryDatasetFileStorage();
        var service = CreateService(database, storage);
        var file = CreateFile("Region,region\nNorth,South\n", "duplicate.csv");

        await Assert.ThrowsAsync<InvalidDataException>(() =>
            service.UploadAsync(null, file));

        Assert.Empty(storage.Files);
        Assert.Empty(database.Datasets);
    }

    [Fact]
    public async Task DeleteAsync_RemovesMetadataAndStoredFile()
    {
        await using var database = CreateDatabase();
        var storage = new MemoryDatasetFileStorage();
        var service = CreateService(database, storage);
        var created = await service.UploadAsync(
            null,
            CreateFile("Region,Revenue\nNorth,1200\n", "sales.csv"));

        var deleted = await service.DeleteAsync(created.Id);

        Assert.True(deleted);
        Assert.Empty(storage.Files);
        Assert.Empty(database.Datasets);
    }

    private static DatasetFileService CreateService(
        AnalyticsDbContext database,
        IDatasetFileStorage storage)
    {
        return new DatasetFileService(
            database,
            storage,
            new CsvInspector(),
            Options.Create(new DatasetStorageOptions()),
            TimeProvider.System,
            NullLogger<DatasetFileService>.Instance);
    }

    private static FormFile CreateFile(string content, string fileName)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "text/csv"
        };
    }

    private static AnalyticsDbContext CreateDatabase()
    {
        var options = new DbContextOptionsBuilder<AnalyticsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AnalyticsDbContext(options);
    }

    private sealed class MemoryDatasetFileStorage : IDatasetFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];

        public async Task<string> SaveAsync(
            Stream content,
            CancellationToken cancellationToken = default)
        {
            var key = $"{Guid.NewGuid():N}.csv";
            await using var copy = new MemoryStream();
            await content.CopyToAsync(copy, cancellationToken);
            Files[key] = copy.ToArray();
            return key;
        }

        public Task<Stream?> OpenReadAsync(
            string storageKey,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Stream? stream = Files.TryGetValue(storageKey, out var content)
                ? new MemoryStream(content, writable: false)
                : null;
            return Task.FromResult(stream);
        }

        public Task DeleteAsync(
            string storageKey,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Files.Remove(storageKey);
            return Task.CompletedTask;
        }
    }
}
