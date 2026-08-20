import { parseNumericValue, profileColumns } from "./profiling";

export type DataRow = Record<string, string>;

export type ChartDatum = {
  label: string;
  value: number;
};

export type ColumnSummary = {
  col: string;
  kind: "numeric" | "categorical";
  distinct: number;
  missing: number;
  completeness: number;
};

function isNumericLike(value: string) {
  return parseNumericValue(value) !== undefined;
}

function toNumberSafe(value: string) {
  return parseNumericValue(value) ?? 0;
}

export function getCategoryCounts(
  rows: DataRow[],
  column: string,
  limit = 15
): ChartDatum[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const label = (row[column] || "—").trim() || "—";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function pickDefaultGroupBy(columns: string[], rows: DataRow[]) {
  if (!columns.length || !rows.length) return columns[0] ?? "";

  const profiles = new Map(
    profileColumns(columns, rows).map((profile) => [profile.column, profile]),
  );

  const candidates = columns
    .map((column) => {
      const values = new Set<string>();
      let nonEmpty = 0;

      for (const row of rows) {
        const value = (row[column] ?? "").trim();
        if (!value) continue;

        nonEmpty++;
        values.add(value);
        if (values.size > 50) break;
      }

      const distinct = values.size;
      const distinctRatio = nonEmpty ? distinct / nonEmpty : 1;
      const name = column.toLowerCase();
      const looksLikeDateOrId =
        name.includes("date") ||
        name.includes("time") ||
        name.includes("id") ||
        name.includes("timestamp");

      let score = 0;
      const profile = profiles.get(column);
      if (profile?.role === "dimension") score += 5;
      if (profile?.role === "identifier") score -= 6;
      if (profile?.role === "description") score -= 3;
      if (profile?.role === "measure") score -= 2;
      if (distinct >= 2) score += 1;
      if (distinct >= 5 && distinct <= 20) score += 3;
      if (distinctRatio > 0.9) score -= 3;
      if (looksLikeDateOrId) score -= 2;

      return { column, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.column ?? columns[0];
}

export function detectNumericColumns(
  columns: string[],
  rows: DataRow[],
  sampleSize = 80
) {
  const sample = rows.slice(0, sampleSize);
  return profileColumns(columns, sample)
    .filter((profile) => profile.type === "number" && profile.role === "measure")
    .map((profile) => profile.column);
}

export function sumByGroup(
  rows: DataRow[],
  groupColumn: string,
  valueColumn: string,
  limit = 15
): ChartDatum[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const label = (row[groupColumn] || "—").trim() || "—";
    const value = toNumberSafe(row[valueColumn] ?? "");
    totals.set(label, (totals.get(label) ?? 0) + value);
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function formatNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function columnStats(columns: string[], rows: DataRow[]): ColumnSummary[] {
  const rowCount = rows.length;

  return columns.map((column) => {
    let missing = 0;
    const distinctValues = new Set<string>();

    for (const row of rows) {
      const value = (row[column] ?? "").trim();
      if (!value) missing++;
      else distinctValues.add(value);
    }

    const sample = rows.slice(0, Math.min(80, rowCount));
    let seen = 0;
    let numeric = 0;

    for (const row of sample) {
      const value = (row[column] ?? "").trim();
      if (!value) continue;

      seen++;
      if (isNumericLike(value)) numeric++;
    }

    return {
      col: column,
      kind: seen > 0 && numeric / seen >= 0.8 ? "numeric" : "categorical",
      distinct: distinctValues.size,
      missing,
      completeness: rowCount ? (rowCount - missing) / rowCount : 0,
    };
  });
}
