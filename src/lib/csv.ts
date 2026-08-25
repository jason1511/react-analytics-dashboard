import Papa from "papaparse";
import type { DataRow } from "../state/dataset-context";

export type ParsedCsv = {
  columns: string[];
  rows: DataRow[];
};

export function parseCsvText(text: string): ParsedCsv {
  const results = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: true,
  });

  const fatalError = results.errors.find(
    (error) => error.code !== "UndetectableDelimiter"
  );
  if (fatalError) {
    throw new Error(fatalError.message);
  }

  if (!results.data.length) {
    throw new Error("No columns detected. Make sure the first row is the header.");
  }
  const columns = results.data[0].map((field) => field.trim());
  if (columns.some((column) => !column)) throw new Error("Every column must have a header.");
  if (new Set(columns).size !== columns.length) throw new Error("Column headers must be unique.");

  const rows = results.data.slice(1).map((row) => {
    const normalized: DataRow = {};
    for (let index = 0; index < columns.length; index++) {
      const column = columns[index];
      normalized[column] = row[index] == null ? "" : String(row[index]);
    }
    return normalized;
  });

  return { columns, rows };
}
