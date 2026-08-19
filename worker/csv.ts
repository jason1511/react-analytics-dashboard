import Papa from "papaparse";

export type CsvInspection = {
  rowCount: number;
  columnCount: number;
};

export function inspectCsv(text: string): CsvInspection {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
  }
  if (parsed.data.length < 2) {
    throw new Error("The CSV must include a header and at least one data row.");
  }

  const headers = parsed.data[0].map((header) => header.trim());
  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    throw new Error("Every CSV column must have a header.");
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error("CSV column headers must be unique.");
  }

  return {
    rowCount: parsed.data.length - 1,
    columnCount: headers.length,
  };
}
