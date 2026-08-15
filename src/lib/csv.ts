import Papa from "papaparse";
import type { DataRow } from "../state/dataset-context";

export type ParsedCsv = {
  columns: string[];
  rows: DataRow[];
};

export function parseCsvText(text: string): ParsedCsv {
  const results = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const fatalError = results.errors.find(
    (error) => error.code !== "UndetectableDelimiter"
  );
  if (fatalError) {
    throw new Error(fatalError.message);
  }

  return normalizeResults(results.data, results.meta.fields);
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fatalError = results.errors.find(
          (error) => error.code !== "UndetectableDelimiter"
        );
        if (fatalError) {
          reject(new Error(fatalError.message));
          return;
        }

        try {
          resolve(normalizeResults(results.data, results.meta.fields));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
}

function normalizeResults(
  data: Record<string, unknown>[],
  fields: string[] | undefined
): ParsedCsv {
  const columns = fields?.filter((field) => field.trim().length > 0) ?? [];
  if (columns.length === 0) {
    throw new Error("No columns detected. Make sure the first row is the header.");
  }

  const rows = data.filter(Boolean).map((row) => {
    const normalized: DataRow = {};
    for (const column of columns) {
      normalized[column] = row[column] == null ? "" : String(row[column]);
    }
    return normalized;
  });

  return { columns, rows };
}
