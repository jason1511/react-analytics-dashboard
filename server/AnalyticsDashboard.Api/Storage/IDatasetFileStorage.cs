namespace AnalyticsDashboard.Api.Storage;

public interface IDatasetFileStorage
{
    Task<string> SaveAsync(Stream content, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default);
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default);
}
