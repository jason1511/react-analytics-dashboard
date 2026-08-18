using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace AnalyticsDashboard.Api.Storage;

public sealed class S3DatasetFileStorage(
    IAmazonS3 client,
    IOptions<S3DatasetStorageOptions> options) : IDatasetFileStorage
{
    private readonly string bucketName = options.Value.BucketName;

    public async Task<string> SaveAsync(
        Stream content,
        CancellationToken cancellationToken = default)
    {
        var storageKey = $"datasets/{Guid.NewGuid():N}.csv";
        await client.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = bucketName,
                Key = storageKey,
                InputStream = content,
                ContentType = "text/csv",
                DisablePayloadSigning = true,
                DisableDefaultChecksumValidation = true
            },
            cancellationToken);
        return storageKey;
    }

    public async Task<Stream?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        ValidateStorageKey(storageKey);
        try
        {
            using var response = await client.GetObjectAsync(
                bucketName,
                storageKey,
                cancellationToken);
            var copy = new MemoryStream();
            await response.ResponseStream.CopyToAsync(copy, cancellationToken);
            copy.Position = 0;
            return copy;
        }
        catch (AmazonS3Exception exception)
            when (exception.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task DeleteAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        ValidateStorageKey(storageKey);
        await client.DeleteObjectAsync(bucketName, storageKey, cancellationToken);
    }

    private static void ValidateStorageKey(string storageKey)
    {
        const string prefix = "datasets/";
        if (!storageKey.StartsWith(prefix, StringComparison.Ordinal) ||
            !string.Equals(
                Path.GetFileName(storageKey),
                storageKey[prefix.Length..],
                StringComparison.Ordinal) ||
            !storageKey.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid dataset storage key.", nameof(storageKey));
        }
    }
}
