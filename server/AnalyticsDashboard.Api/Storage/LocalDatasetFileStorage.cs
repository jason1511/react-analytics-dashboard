using Microsoft.Extensions.Options;

namespace AnalyticsDashboard.Api.Storage;

public sealed class LocalDatasetFileStorage : IDatasetFileStorage
{
    private readonly string storagePath;

    public LocalDatasetFileStorage(
        IHostEnvironment environment,
        IOptions<DatasetStorageOptions> options)
    {
        var configuredPath = options.Value.Path;
        storagePath = Path.IsPathRooted(configuredPath)
            ? Path.GetFullPath(configuredPath)
            : Path.GetFullPath(Path.Combine(environment.ContentRootPath, configuredPath));

        Directory.CreateDirectory(storagePath);
    }

    public async Task<string> SaveAsync(
        Stream content,
        CancellationToken cancellationToken = default)
    {
        var storageKey = $"{Guid.NewGuid():N}.csv";
        var path = ResolvePath(storageKey);

        await using var destination = new FileStream(
            path,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            bufferSize: 81920,
            useAsync: true);
        await content.CopyToAsync(destination, cancellationToken);

        return storageKey;
    }

    public Task<Stream?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var path = ResolvePath(storageKey);

        Stream? stream = File.Exists(path)
            ? new FileStream(
                path,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 81920,
                useAsync: true)
            : null;

        return Task.FromResult(stream);
    }

    public Task DeleteAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var path = ResolvePath(storageKey);

        if (File.Exists(path))
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }

    private string ResolvePath(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey) ||
            !string.Equals(Path.GetFileName(storageKey), storageKey, StringComparison.Ordinal) ||
            !storageKey.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid dataset storage key.", nameof(storageKey));
        }

        var path = Path.GetFullPath(Path.Combine(storagePath, storageKey));
        if (!path.StartsWith(storagePath + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Dataset path escaped the configured storage directory.");
        }

        return path;
    }
}
