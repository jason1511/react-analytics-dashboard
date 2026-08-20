import type { DataRow } from "./analytics";
import { isDateLike, parseNumericValue } from "./profiling";
import type { DatasetStatistics } from "./statistics";

export type QualitySeverity = "error" | "warning" | "info";

export type QualityIssue = {
  id: string;
  severity: QualitySeverity;
  category:
    | "missing"
    | "duplicate"
    | "invalid"
    | "mixed"
    | "constant"
    | "outlier"
    | "formatting";
  title: string;
  description: string;
  column?: string;
  affectedCount: number;
  rowIndices: number[];
  examples: string[];
};

export type QualityReport = {
  score: number;
  issues: QualityIssue[];
  counts: Record<QualitySeverity, number>;
};

function issueId(category: QualityIssue["category"], column?: string) {
  return `${category}:${column ?? "dataset"}`;
}

function examplesFor(rows: DataRow[], indices: number[], column?: string) {
  if (!column) return indices.slice(0, 3).map((index) => `Row ${index + 1}`);
  return [...new Set(indices.map((index) => rows[index]?.[column] ?? ""))].slice(0, 3);
}

function duplicateRowIssue(columns: string[], rows: DataRow[]): QualityIssue | undefined {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];
  for (let index = 0; index < rows.length; index++) {
    const signature = JSON.stringify(columns.map((column) => (rows[index][column] ?? "").trim()));
    if (seen.has(signature)) duplicates.push(index);
    else seen.set(signature, index);
  }
  if (!duplicates.length) return undefined;
  return {
    id: issueId("duplicate"),
    severity: duplicates.length / Math.max(1, rows.length) >= 0.1 ? "warning" : "info",
    category: "duplicate",
    title: "Duplicate rows detected",
    description: "These rows repeat every value from a row that appeared earlier.",
    affectedCount: duplicates.length,
    rowIndices: duplicates,
    examples: examplesFor(rows, duplicates),
  };
}

function missingIssue(column: string, rows: DataRow[]): QualityIssue | undefined {
  const indices = rows
    .map((row, index) => (!(row[column] ?? "").trim() ? index : -1))
    .filter((index) => index >= 0);
  if (!indices.length) return undefined;
  const ratio = indices.length / Math.max(1, rows.length);
  return {
    id: issueId("missing", column),
    severity: ratio >= 0.4 ? "error" : ratio >= 0.1 ? "warning" : "info",
    category: "missing",
    title: `${column} contains missing values`,
    description: `${(ratio * 100).toFixed(1)}% of rows have no value in this column.`,
    column,
    affectedCount: indices.length,
    rowIndices: indices,
    examples: examplesFor(rows, indices, column),
  };
}

function constantIssue(column: string, rows: DataRow[]): QualityIssue | undefined {
  const populatedIndices = rows
    .map((row, index) => ((row[column] ?? "").trim() ? index : -1))
    .filter((index) => index >= 0);
  const values = populatedIndices.map((index) => (rows[index][column] ?? "").trim());
  if (!values.length || new Set(values).size !== 1) return undefined;
  return {
    id: issueId("constant", column),
    severity: "info",
    category: "constant",
    title: `${column} has one constant value`,
    description: "A constant column does not add variation for grouping or charting.",
    column,
    affectedCount: values.length,
    rowIndices: populatedIndices,
    examples: [values[0]],
  };
}

function invalidTypeIssue(
  column: string,
  type: string,
  rows: DataRow[],
): QualityIssue | undefined {
  if (type !== "number" && type !== "date") return undefined;
  const invalid = rows
    .map((row, index) => {
      const value = (row[column] ?? "").trim();
      if (!value) return -1;
      const valid = type === "number" ? parseNumericValue(value) !== undefined : isDateLike(value);
      return valid ? -1 : index;
    })
    .filter((index) => index >= 0);
  if (!invalid.length) return undefined;
  return {
    id: issueId("invalid", column),
    severity: "warning",
    category: "invalid",
    title: `${column} contains invalid ${type} values`,
    description: "Some populated values cannot be parsed using the detected or selected column type.",
    column,
    affectedCount: invalid.length,
    rowIndices: invalid,
    examples: examplesFor(rows, invalid, column),
  };
}

function mixedTypeIssue(column: string, rows: DataRow[]): QualityIssue | undefined {
  const values = rows.map((row) => (row[column] ?? "").trim()).filter(Boolean);
  if (values.length < 4) return undefined;
  const numericRatio = values.filter((value) => parseNumericValue(value) !== undefined).length / values.length;
  const dateRatio = values.filter(isDateLike).length / values.length;
  const ratio = Math.max(numericRatio, dateRatio);
  if (ratio < 0.2 || ratio > 0.8) return undefined;
  const minorityAreNumeric = numericRatio >= dateRatio;
  const indices = rows
    .map((row, index) => {
      const value = (row[column] ?? "").trim();
      if (!value) return -1;
      const matchesDominant = minorityAreNumeric
        ? parseNumericValue(value) !== undefined
        : isDateLike(value);
      return matchesDominant ? -1 : index;
    })
    .filter((index) => index >= 0);
  return {
    id: issueId("mixed", column),
    severity: "warning",
    category: "mixed",
    title: `${column} mixes incompatible value types`,
    description: "The column contains a meaningful mixture of structured values and other text.",
    column,
    affectedCount: indices.length,
    rowIndices: indices,
    examples: examplesFor(rows, indices, column),
  };
}

function whitespaceIssue(column: string, rows: DataRow[]): QualityIssue | undefined {
  const indices = rows
    .map((row, index) => {
      const raw = row[column] ?? "";
      return raw && raw !== raw.trim() ? index : -1;
    })
    .filter((index) => index >= 0);
  if (!indices.length) return undefined;
  return {
    id: issueId("formatting", `${column}:whitespace`),
    severity: "info",
    category: "formatting",
    title: `${column} contains surrounding whitespace`,
    description: "Leading or trailing spaces can create categories that look identical.",
    column,
    affectedCount: indices.length,
    rowIndices: indices,
    examples: examplesFor(rows, indices, column),
  };
}

function categoryVariantIssue(column: string, rows: DataRow[]): QualityIssue | undefined {
  const variants = new Map<string, Set<string>>();
  const indicesByNormalised = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const value = (row[column] ?? "").trim();
    if (!value) return;
    const normalised = value.toLocaleLowerCase();
    if (!variants.has(normalised)) variants.set(normalised, new Set());
    variants.get(normalised)?.add(value);
    if (!indicesByNormalised.has(normalised)) indicesByNormalised.set(normalised, []);
    indicesByNormalised.get(normalised)?.push(index);
  });
  const inconsistentKeys = [...variants.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([key]) => key);
  if (!inconsistentKeys.length) return undefined;
  const indices = inconsistentKeys.flatMap((key) => indicesByNormalised.get(key) ?? []);
  const examples = inconsistentKeys
    .flatMap((key) => [...(variants.get(key) ?? [])])
    .slice(0, 4);
  return {
    id: issueId("formatting", `${column}:variants`),
    severity: "warning",
    category: "formatting",
    title: `${column} contains inconsistent category casing`,
    description: "Values differ only by letter casing and may represent the same category.",
    column,
    affectedCount: indices.length,
    rowIndices: indices,
    examples,
  };
}

function identifierDuplicateIssue(column: string, rows: DataRow[]): QualityIssue | undefined {
  const valueIndices = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const value = (row[column] ?? "").trim();
    if (!value) return;
    if (!valueIndices.has(value)) valueIndices.set(value, []);
    valueIndices.get(value)?.push(index);
  });
  const duplicates = [...valueIndices.values()].filter((indices) => indices.length > 1).flat();
  if (!duplicates.length) return undefined;
  return {
    id: issueId("duplicate", column),
    severity: "error",
    category: "duplicate",
    title: `${column} contains duplicate identifiers`,
    description: "An identifier is expected to uniquely distinguish each populated row.",
    column,
    affectedCount: duplicates.length,
    rowIndices: duplicates,
    examples: examplesFor(rows, duplicates, column),
  };
}

function outlierIssue(
  column: string,
  firstQuartile: number,
  thirdQuartile: number,
  rows: DataRow[],
): QualityIssue | undefined {
  const range = thirdQuartile - firstQuartile;
  if (range <= 0) return undefined;
  const lower = firstQuartile - 1.5 * range;
  const upper = thirdQuartile + 1.5 * range;
  const indices = rows
    .map((row, index) => {
      const value = parseNumericValue(row[column] ?? "");
      return value !== undefined && (value < lower || value > upper) ? index : -1;
    })
    .filter((index) => index >= 0);
  if (!indices.length) return undefined;
  return {
    id: issueId("outlier", column),
    severity: "info",
    category: "outlier",
    title: `${column} contains potential outliers`,
    description: "Values fall outside 1.5 times the interquartile range. They may be valid but deserve review.",
    column,
    affectedCount: indices.length,
    rowIndices: indices,
    examples: examplesFor(rows, indices, column),
  };
}

export function analyseDataQuality(
  columns: string[],
  rows: DataRow[],
  statistics: DatasetStatistics,
): QualityReport {
  const issues: QualityIssue[] = [];
  const duplicate = duplicateRowIssue(columns, rows);
  if (duplicate) issues.push(duplicate);

  for (const columnStatistics of statistics.columns) {
    const { profile } = columnStatistics;
    const candidates = [
      missingIssue(profile.column, rows),
      constantIssue(profile.column, rows),
      invalidTypeIssue(profile.column, profile.type, rows),
      mixedTypeIssue(profile.column, rows),
      whitespaceIssue(profile.column, rows),
      profile.type === "category" ? categoryVariantIssue(profile.column, rows) : undefined,
      profile.role === "identifier" ? identifierDuplicateIssue(profile.column, rows) : undefined,
      profile.role === "measure" && columnStatistics.numeric
        ? outlierIssue(
            profile.column,
            columnStatistics.numeric.firstQuartile,
            columnStatistics.numeric.thirdQuartile,
            rows,
          )
        : undefined,
    ];
    for (const issue of candidates) if (issue) issues.push(issue);
  }

  const severityOrder: Record<QualitySeverity, number> = { error: 0, warning: 1, info: 2 };
  issues.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      b.affectedCount - a.affectedCount,
  );
  const counts: Record<QualitySeverity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity]++;
  const penalty = counts.error * 15 + counts.warning * 7 + counts.info * 2;

  return {
    score: Math.max(0, 100 - penalty),
    issues,
    counts,
  };
}
