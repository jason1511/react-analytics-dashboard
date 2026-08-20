import type { DataRow } from "./analytics";

export type ColumnType =
  | "number"
  | "date"
  | "boolean"
  | "category"
  | "text"
  | "empty";

export type AnalyticalRole =
  | "measure"
  | "dimension"
  | "temporal"
  | "identifier"
  | "description"
  | "unknown";

export type ColumnProfile = {
  column: string;
  type: ColumnType;
  role: AnalyticalRole;
  confidence: number;
  reason: string;
  distinct: number;
  missing: number;
  completeness: number;
  sampleValues: string[];
};

const BOOLEAN_PAIRS = [
  new Set(["true", "false"]),
  new Set(["yes", "no"]),
  new Set(["y", "n"]),
  new Set(["on", "off"]),
  new Set(["active", "inactive"]),
  new Set(["1", "0"]),
];

const ID_NAME_PATTERN =
  /(^|\b|_)(id|identifier|uuid|guid|key|code|sku|serial|reference|ref|number|no)(\b|_|$)/i;
const DESCRIPTION_NAME_PATTERN = /(^|\b|_)(description|comment|comments|note|notes|message|details?)(\b|_|$)/i;
const DIMENSION_NAME_PATTERN =
  /(^|\b|_)(name|category|type|status|region|country|city|state|department|segment|channel|product)(\b|_|$)/i;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normaliseName(name: string) {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_.]+/g, " ");
}

function sampleRows(rows: DataRow[], maximum = 500) {
  if (rows.length <= maximum) return rows;

  const sampled: DataRow[] = [];
  const step = (rows.length - 1) / (maximum - 1);
  for (let index = 0; index < maximum; index++) {
    sampled.push(rows[Math.round(index * step)]);
  }
  return sampled;
}

export function parseNumericValue(value: string) {
  let cleaned = value.trim();
  if (!cleaned) return undefined;

  const negative = /^\(.*\)$/.test(cleaned);
  if (negative) cleaned = cleaned.slice(1, -1);

  cleaned = cleaned
    .replace(/[$£€¥₹]/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/%$/, "");

  if (!cleaned || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cleaned)) {
    return undefined;
  }

  const number = Number(cleaned);
  if (!Number.isFinite(number)) return undefined;
  return negative ? -number : number;
}

function validCalendarDate(year: number, month: number, day: number) {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isDateLike(value: string) {
  const candidate = value.trim();
  if (!candidate || /^\d+(?:\.\d+)?$/.test(candidate)) return false;

  const yearFirst = candidate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (yearFirst) {
    return validCalendarDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
  }

  const dayFirst = candidate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s].*)?$/);
  if (dayFirst) {
    const first = Number(dayFirst[1]);
    const second = Number(dayFirst[2]);
    const year = Number(dayFirst[3]);
    return validCalendarDate(year, second, first) || validCalendarDate(year, first, second);
  }

  if (!/[A-Za-z]/.test(candidate)) return false;
  return /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
    candidate,
  ) && !Number.isNaN(Date.parse(candidate));
}

function isBooleanSet(values: string[]) {
  const distinct = new Set(values.map((value) => value.toLowerCase()));
  if (distinct.size !== 2) return false;
  return BOOLEAN_PAIRS.some((pair) => [...distinct].every((value) => pair.has(value)));
}

function looksLikeIdentifierValues(values: string[]) {
  if (!values.length) return false;
  const identifierLike = values.filter(
    (value) =>
      /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ||
      /^(?=.*\d)[A-Za-z0-9]+(?:[-_/][A-Za-z0-9]+)+$/.test(value),
  ).length;
  return identifierLike / values.length >= 0.8;
}

function inferRole(
  column: string,
  type: ColumnType,
  nonEmptyValues: string[],
  distinct: number,
) {
  const normalisedName = normaliseName(column);
  const uniqueRatio = nonEmptyValues.length ? distinct / nonEmptyValues.length : 0;
  const idByName = ID_NAME_PATTERN.test(normalisedName);

  if (
    (idByName && uniqueRatio >= 0.7) ||
    (uniqueRatio >= 0.9 && looksLikeIdentifierValues(nonEmptyValues))
  ) {
    return {
      role: "identifier" as const,
      reason: idByName
        ? "Its name and mostly unique values indicate an identifier."
        : "Its values are unique and follow an identifier pattern.",
    };
  }

  if (type === "date") {
    return { role: "temporal" as const, reason: "Date values make this a time dimension." };
  }
  if (type === "number") {
    return { role: "measure" as const, reason: "Numeric values can be aggregated as a measure." };
  }
  if (type === "category" || type === "boolean") {
    return { role: "dimension" as const, reason: "Repeating values are suitable for grouping." };
  }
  if (type === "empty") {
    return { role: "unknown" as const, reason: "No populated values were available to classify." };
  }
  if (DIMENSION_NAME_PATTERN.test(normalisedName) && uniqueRatio < 0.9) {
    return { role: "dimension" as const, reason: "Its name and repeated values indicate a dimension." };
  }
  if (DESCRIPTION_NAME_PATTERN.test(normalisedName) || type === "text") {
    return { role: "description" as const, reason: "Free-form values are best treated as descriptive text." };
  }

  return { role: "unknown" as const, reason: "The analytical role is not yet clear." };
}

export function profileColumn(column: string, rows: DataRow[]): ColumnProfile {
  const rowCount = rows.length;
  const allValues = rows.map((row) => (row[column] ?? "").trim());
  const nonEmptyValues = allValues.filter(Boolean);
  const missing = rowCount - nonEmptyValues.length;
  const distinct = new Set(nonEmptyValues).size;
  const sampledValues = sampleRows(rows)
    .map((row) => (row[column] ?? "").trim())
    .filter(Boolean);
  const sampleValues = [...new Set(nonEmptyValues)].slice(0, 3);

  let type: ColumnType = "empty";
  let confidence = 1;
  let typeReason = "The column has no populated values.";

  if (sampledValues.length) {
    const numericRatio =
      sampledValues.filter((value) => parseNumericValue(value) !== undefined).length /
      sampledValues.length;
    const dateRatio = sampledValues.filter(isDateLike).length / sampledValues.length;
    const sampledDistinct = new Set(sampledValues).size;
    const distinctRatio = sampledDistinct / sampledValues.length;
    const averageLength =
      sampledValues.reduce((total, value) => total + value.length, 0) / sampledValues.length;

    if (isBooleanSet(sampledValues)) {
      type = "boolean";
      confidence = 1;
      typeReason = "The sampled values form a recognised two-value boolean pair.";
    } else if (dateRatio >= 0.8) {
      type = "date";
      confidence = dateRatio;
      typeReason = `${Math.round(dateRatio * 100)}% of sampled values are valid dates.`;
    } else if (numericRatio >= 0.8) {
      type = "number";
      confidence = numericRatio;
      typeReason = `${Math.round(numericRatio * 100)}% of sampled values are numeric.`;
    } else {
      const categoryLimit = Math.max(12, Math.min(50, Math.ceil(Math.sqrt(sampledValues.length) * 2)));
      const categoryByShape = sampledDistinct <= categoryLimit && distinctRatio <= 0.6;
      const categoryByName = DIMENSION_NAME_PATTERN.test(normaliseName(column)) && distinctRatio < 0.9;

      if (categoryByShape || categoryByName) {
        type = "category";
        confidence = clamp(0.7 + (1 - distinctRatio) * 0.25);
        typeReason = `${sampledDistinct.toLocaleString()} repeating values were found in the sample.`;
      } else {
        type = "text";
        confidence = clamp(0.65 + distinctRatio * 0.2 + (averageLength >= 20 ? 0.1 : 0));
        typeReason = "Values are mostly distinct or free-form text.";
      }
    }
  }

  const roleResult = inferRole(column, type, sampledValues, new Set(sampledValues).size);

  return {
    column,
    type,
    role: roleResult.role,
    confidence,
    reason: `${typeReason} ${roleResult.reason}`,
    distinct,
    missing,
    completeness: rowCount ? (rowCount - missing) / rowCount : 0,
    sampleValues,
  };
}

export function profileColumns(columns: string[], rows: DataRow[]) {
  return columns.map((column) => profileColumn(column, rows));
}
