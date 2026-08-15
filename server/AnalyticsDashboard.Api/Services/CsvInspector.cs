using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;

namespace AnalyticsDashboard.Api.Services;

public sealed record CsvInspection(int RowCount, int ColumnCount);

public sealed class CsvInspector
{
    public async Task<CsvInspection> InspectAsync(
        Stream content,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var reader = new StreamReader(
                content,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true,
                leaveOpen: true);
            using var csv = new CsvReader(
                reader,
                new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    BadDataFound = _ => throw new InvalidDataException(
                        "The file contains malformed CSV data.")
                });

            if (!await csv.ReadAsync() || !csv.ReadHeader())
            {
                throw new InvalidDataException("The CSV file must contain a header row.");
            }

            var headers = csv.HeaderRecord ?? [];
            if (headers.Length == 0 || headers.Any(string.IsNullOrWhiteSpace))
            {
                throw new InvalidDataException("Every CSV column must have a header.");
            }

            if (headers.Distinct(StringComparer.OrdinalIgnoreCase).Count() != headers.Length)
            {
                throw new InvalidDataException("CSV column headers must be unique.");
            }

            var rowCount = 0;
            while (await csv.ReadAsync())
            {
                cancellationToken.ThrowIfCancellationRequested();
                rowCount++;
            }

            return new CsvInspection(rowCount, headers.Length);
        }
        catch (CsvHelperException exception)
        {
            throw new InvalidDataException("The file could not be parsed as CSV.", exception);
        }
    }
}
