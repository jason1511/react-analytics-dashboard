import Papa from "papaparse";
import type { DataRow } from "../state/dataset-context";
import { parseCsvText, type ParsedCsv } from "./csv";

export type DataFileFormat = "csv" | "tsv" | "json" | "xlsx";

export type ParsedDataFile = ParsedCsv & {
  format: DataFileFormat;
};

export const MAX_DATA_FILE_SIZE = 10 * 1024 * 1024;
export const DATA_FILE_ACCEPT = [
  ".csv",
  ".tsv",
  ".json",
  ".xlsx",
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

function extension(fileName: string) {
  return fileName.toLowerCase().match(/\.([^.]+)$/)?.[1];
}

export function detectDataFileFormat(file: Pick<File, "name" | "type">): DataFileFormat {
  const fileExtension = extension(file.name);
  if (fileExtension === "csv" || fileExtension === "tsv" || fileExtension === "json" || fileExtension === "xlsx") {
    return fileExtension;
  }

  if (file.type === "text/csv") return "csv";
  if (file.type === "text/tab-separated-values") return "tsv";
  if (file.type === "application/json") return "json";
  if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "xlsx";
  }

  throw new Error("Unsupported file type. Choose a CSV, TSV, JSON, or XLSX file.");
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeMatrix(matrix: readonly (readonly unknown[])[]): ParsedCsv {
  const firstPopulatedRow = matrix.findIndex((row) => row.some((cell) => cellText(cell).trim()));
  if (firstPopulatedRow < 0) {
    throw new Error("No columns detected. Make sure the first populated row contains headers.");
  }

  const headerCells = matrix[firstPopulatedRow];
  const columns = headerCells.map((cell) => cellText(cell).trim());
  if (!columns.length || columns.some((column) => !column)) {
    throw new Error("Every column must have a header.");
  }
  if (new Set(columns).size !== columns.length) {
    throw new Error("Column headers must be unique.");
  }

  const rows = matrix
    .slice(firstPopulatedRow + 1)
    .filter((row) => row.some((cell) => cellText(cell).trim()))
    .map((row) => Object.fromEntries(
      columns.map((column, index) => [column, cellText(row[index])]),
    ) as DataRow);

  if (!rows.length) throw new Error("The dataset must include at least one data row.");
  return { columns, rows };
}

function parseTsvText(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    delimiter: "\t",
    skipEmptyLines: true,
  });
  const fatalError = result.errors.find((error) => error.code !== "UndetectableDelimiter");
  if (fatalError) throw new Error(fatalError.message);
  return normalizeMatrix(result.data);
}

function extractJsonRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (!value || typeof value !== "object") {
    throw new Error("JSON must contain an array of objects.");
  }

  const object = value as Record<string, unknown>;
  for (const key of ["data", "rows", "records", "items"]) {
    if (Array.isArray(object[key])) return object[key] as Record<string, unknown>[];
  }

  const arrays = Object.values(object).filter(Array.isArray);
  if (arrays.length === 1) return arrays[0] as Record<string, unknown>[];
  throw new Error("JSON must be an array of objects or contain one under data, rows, records, or items.");
}

export function parseJsonText(text: string): ParsedCsv {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("The JSON file is not valid JSON.");
  }

  const records = extractJsonRecords(value);
  if (!records.length) throw new Error("The JSON dataset must include at least one data row.");
  if (records.some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
    throw new Error("Every JSON data row must be an object.");
  }

  const keyMap = new Map<string, string>();
  for (const record of records) {
    for (const rawKey of Object.keys(record)) {
      const column = rawKey.trim();
      if (!column) throw new Error("Every JSON property used as a column must have a name.");
      const existing = keyMap.get(column);
      if (existing && existing !== rawKey) {
        throw new Error("JSON property names must remain unique after whitespace is removed.");
      }
      keyMap.set(column, rawKey);
    }
  }

  const columns = [...keyMap.keys()];
  if (!columns.length) throw new Error("No columns were found in the JSON objects.");
  const rows = records.map((record) => Object.fromEntries(
    columns.map((column) => [column, cellText(record[keyMap.get(column) ?? column])]),
  ) as DataRow);
  return { columns, rows };
}

export async function parseDataFile(file: File): Promise<ParsedDataFile> {
  if (!file.size) throw new Error("Choose a non-empty data file.");
  if (file.size > MAX_DATA_FILE_SIZE) throw new Error("The data file exceeds the 10 MB limit.");

  const format = detectDataFileFormat(file);
  let parsed: ParsedCsv;
  if (format === "csv") parsed = parseCsvText(await file.text());
  else if (format === "tsv") parsed = parseTsvText(await file.text());
  else if (format === "json") parsed = parseJsonText(await file.text());
  else {
    const { readSheet } = await import("read-excel-file/browser");
    parsed = normalizeMatrix(await readSheet(file));
  }

  if (!parsed.rows.length) throw new Error("The dataset must include at least one data row.");
  return { ...parsed, format };
}

export function createNormalizedCsvFile(parsed: ParsedCsv, sourceFileName: string) {
  const csv = Papa.unparse({
    fields: parsed.columns,
    data: parsed.rows.map((row) => parsed.columns.map((column) => row[column] ?? "")),
  });
  const baseName = sourceFileName.replace(/\.(csv|tsv|json|xlsx)$/i, "") || "dataset";
  const normalized = new File([csv], `${baseName}.csv`, { type: "text/csv;charset=utf-8" });
  if (normalized.size > MAX_DATA_FILE_SIZE) {
    throw new Error("The imported dataset exceeds the 10 MB limit after conversion.");
  }
  return normalized;
}
