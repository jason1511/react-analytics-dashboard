import type { DataRow } from "./analytics";
import {
  parseDateValue,
  parseNumericValue,
  profileColumns,
  type AnalyticalRole,
  type ColumnOverride,
  type ColumnProfile,
  type ColumnType,
} from "./profiling";

export type ValueFrequency = {
  value: string;
  count: number;
  percentage: number;
};

export type NumericStatistics = {
  count: number;
  minimum: number;
  maximum: number;
  sum: number;
  mean: number;
  median: number;
  firstQuartile: number;
  thirdQuartile: number;
  standardDeviation: number;
  zeroCount: number;
  negativeCount: number;
};

export type DateStatistics = {
  validCount: number;
  earliest: string;
  latest: string;
};

export type TextStatistics = {
  minimumLength: number;
  maximumLength: number;
  averageLength: number;
};

export type IdentifierStatistics = {
  uniquePercentage: number;
  duplicateValues: number;
};

export type ColumnStatistics = {
  profile: ColumnProfile;
  populatedCount: number;
  numeric?: NumericStatistics;
  date?: DateStatistics;
  frequencies?: ValueFrequency[];
  text?: TextStatistics;
  identifier?: IdentifierStatistics;
};

export type DatasetStatistics = {
  rowCount: number;
  columnCount: number;
  totalCells: number;
  populatedCells: number;
  missingCells: number;
  completeness: number;
  duplicateRows: number;
  dateCoverage?: { earliest: string; latest: string };
  typeCounts: Record<ColumnType, number>;
  roleCounts: Record<AnalyticalRole, number>;
  columns: ColumnStatistics[];
};

function quantile(sortedValues: number[], percentile: number) {
  if (!sortedValues.length) return 0;
  const position = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower);
}

function numericStatistics(values: string[]): NumericStatistics | undefined {
  const numbers = values
    .map(parseNumericValue)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  if (!numbers.length) return undefined;

  const sum = numbers.reduce((total, value) => total + value, 0);
  const mean = sum / numbers.length;
  const variance =
    numbers.reduce((total, value) => total + (value - mean) ** 2, 0) / numbers.length;

  return {
    count: numbers.length,
    minimum: numbers[0],
    maximum: numbers[numbers.length - 1],
    sum,
    mean,
    median: quantile(numbers, 0.5),
    firstQuartile: quantile(numbers, 0.25),
    thirdQuartile: quantile(numbers, 0.75),
    standardDeviation: Math.sqrt(variance),
    zeroCount: numbers.filter((value) => value === 0).length,
    negativeCount: numbers.filter((value) => value < 0).length,
  };
}

function dateStatistics(values: string[]): DateStatistics | undefined {
  const timestamps = values
    .map(parseDateValue)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  if (!timestamps.length) return undefined;

  return {
    validCount: timestamps.length,
    earliest: new Date(timestamps[0]).toISOString(),
    latest: new Date(timestamps[timestamps.length - 1]).toISOString(),
  };
}

function valueFrequencies(values: string[], limit = 5): ValueFrequency[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      percentage: values.length ? count / values.length : 0,
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

function textStatistics(values: string[]): TextStatistics | undefined {
  if (!values.length) return undefined;
  const lengths = values.map((value) => value.length);
  return {
    minimumLength: lengths.reduce((minimum, length) => Math.min(minimum, length), lengths[0]),
    maximumLength: lengths.reduce((maximum, length) => Math.max(maximum, length), lengths[0]),
    averageLength: lengths.reduce((total, length) => total + length, 0) / lengths.length,
  };
}

function columnStatistics(profile: ColumnProfile, rows: DataRow[]): ColumnStatistics {
  const values = rows.map((row) => (row[profile.column] ?? "").trim()).filter(Boolean);
  const result: ColumnStatistics = {
    profile,
    populatedCount: values.length,
  };

  if (profile.type === "number") result.numeric = numericStatistics(values);
  if (profile.type === "date") result.date = dateStatistics(values);
  if (profile.type === "category" || profile.type === "boolean") {
    result.frequencies = valueFrequencies(values);
  }
  if (profile.type === "text") result.text = textStatistics(values);
  if (profile.role === "identifier") {
    const distinct = new Set(values).size;
    result.identifier = {
      uniquePercentage: values.length ? distinct / values.length : 0,
      duplicateValues: Math.max(0, values.length - distinct),
    };
  }

  return result;
}

function countDuplicateRows(columns: string[], rows: DataRow[]) {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of rows) {
    const signature = JSON.stringify(columns.map((column) => (row[column] ?? "").trim()));
    if (seen.has(signature)) duplicates++;
    else seen.add(signature);
  }

  return duplicates;
}

function countByType(profiles: ColumnProfile[]) {
  const counts: Record<ColumnType, number> = {
    number: 0,
    date: 0,
    boolean: 0,
    category: 0,
    text: 0,
    empty: 0,
  };
  for (const profile of profiles) counts[profile.type]++;
  return counts;
}

function countByRole(profiles: ColumnProfile[]) {
  const counts: Record<AnalyticalRole, number> = {
    measure: 0,
    dimension: 0,
    temporal: 0,
    identifier: 0,
    description: 0,
    unknown: 0,
  };
  for (const profile of profiles) counts[profile.role]++;
  return counts;
}

export function calculateDatasetStatistics(
  columns: string[],
  rows: DataRow[],
  overrides: Record<string, ColumnOverride> = {},
): DatasetStatistics {
  const profiles = profileColumns(columns, rows).map((profile) => {
    const override = overrides[profile.column];
    if (!override) return profile;
    return {
      ...profile,
      ...override,
      confidence: 1,
      reason: "Type or role manually confirmed for this browser session.",
    };
  });
  const columnResults = profiles.map((profile) => columnStatistics(profile, rows));
  const totalCells = rows.length * columns.length;
  const missingCells = profiles.reduce((total, profile) => total + profile.missing, 0);
  const dateRanges = columnResults
    .map((result) => result.date)
    .filter((value): value is DateStatistics => value !== undefined);
  const earliest = dateRanges.map((range) => range.earliest).sort()[0];
  const latest = dateRanges.map((range) => range.latest).sort().at(-1);

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    totalCells,
    populatedCells: totalCells - missingCells,
    missingCells,
    completeness: totalCells ? (totalCells - missingCells) / totalCells : 0,
    duplicateRows: countDuplicateRows(columns, rows),
    dateCoverage: earliest && latest ? { earliest, latest } : undefined,
    typeCounts: countByType(profiles),
    roleCounts: countByRole(profiles),
    columns: columnResults,
  };
}
