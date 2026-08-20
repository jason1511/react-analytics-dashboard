import type { DataRow } from "./analytics";
import { parseDateValue, parseNumericValue } from "./profiling";
import type { DatasetStatistics } from "./statistics";

export type ChartType = "bar" | "line" | "area" | "donut" | "histogram" | "scatter";
export type Aggregation = "count" | "sum" | "average" | "minimum" | "maximum";
export type DateGranularity = "auto" | "day" | "month" | "year";

export type ChartConfig = {
  id: string;
  title: string;
  type: ChartType;
  xColumn: string;
  yColumn?: string;
  aggregation: Aggregation;
  limit?: number;
  dateGranularity?: DateGranularity;
  source: "recommendation" | "custom";
};

export type ChartRecommendation = ChartConfig & {
  confidence: number;
  reason: string;
};

export type ChartDatum = {
  label: string;
  value?: number;
  x?: number;
  y?: number;
};

type AggregateState = { sum: number; count: number; minimum: number; maximum: number };

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function aggregateValue(state: AggregateState, aggregation: Aggregation) {
  if (aggregation === "count") return state.count;
  if (aggregation === "average") return state.count ? state.sum / state.count : 0;
  if (aggregation === "minimum") return state.minimum;
  if (aggregation === "maximum") return state.maximum;
  return state.sum;
}

function suggestedAggregation(column: string): Aggregation {
  return /price|rate|ratio|percent|score|average|temperature|age/i.test(column)
    ? "average"
    : "sum";
}

function dateGranularity(timestamps: number[], requested: DateGranularity = "auto") {
  if (requested !== "auto") return requested;
  if (!timestamps.length) return "day";
  let minimum = timestamps[0];
  let maximum = timestamps[0];
  for (const timestamp of timestamps) {
    minimum = Math.min(minimum, timestamp);
    maximum = Math.max(maximum, timestamp);
  }
  const spanDays = (maximum - minimum) / 86_400_000;
  if (spanDays > 730) return "year";
  if (spanDays > 90) return "month";
  return "day";
}

function dateBucket(timestamp: number, granularity: Exclude<DateGranularity, "auto">) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (granularity === "year") {
    return { key: `${year}`, label: `${year}` };
  }
  if (granularity === "month") {
    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" }),
    };
  }
  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
    label: date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }),
  };
}

function groupedData(config: ChartConfig, rows: DataRow[]) {
  const dated = config.type === "line" || config.type === "area";
  const timestamps = dated
    ? rows.map((row) => parseDateValue(row[config.xColumn] ?? "")).filter((value): value is number => value !== undefined)
    : [];
  const granularity = dateGranularity(timestamps, config.dateGranularity);
  const groups = new Map<string, { label: string; state: AggregateState }>();

  for (const row of rows) {
    let key = (row[config.xColumn] ?? "").trim() || "Missing";
    let label = key;
    if (dated) {
      const timestamp = parseDateValue(row[config.xColumn] ?? "");
      if (timestamp === undefined) continue;
      const bucket = dateBucket(timestamp, granularity);
      key = bucket.key;
      label = bucket.label;
    }

    const rawValue = config.yColumn ? parseNumericValue(row[config.yColumn] ?? "") : 1;
    if (config.aggregation !== "count" && rawValue === undefined) continue;
    const value = config.aggregation === "count" ? 1 : (rawValue ?? 0);
    const group = groups.get(key) ?? {
      label,
      state: { sum: 0, count: 0, minimum: Number.POSITIVE_INFINITY, maximum: Number.NEGATIVE_INFINITY },
    };
    group.state.sum += value;
    group.state.count++;
    group.state.minimum = Math.min(group.state.minimum, value);
    group.state.maximum = Math.max(group.state.maximum, value);
    groups.set(key, group);
  }

  const data = [...groups.entries()].map(([key, group]) => ({
    key,
    label: group.label,
    value: aggregateValue(group.state, config.aggregation),
  }));
  if (dated) data.sort((a, b) => a.key.localeCompare(b.key));
  else data.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return data
    .slice(0, config.limit ?? (dated ? 60 : 15))
    .map(({ label, value }) => ({ label, value }));
}

function histogramData(config: ChartConfig, rows: DataRow[]): ChartDatum[] {
  const values = rows
    .map((row) => parseNumericValue(row[config.xColumn] ?? ""))
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  if (!values.length) return [];
  const minimum = values[0];
  const maximum = values[values.length - 1];
  if (minimum === maximum) return [{ label: String(minimum), value: values.length }];
  const binCount = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(values.length))));
  const width = (maximum - minimum) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: minimum + index * width,
    end: minimum + (index + 1) * width,
    count: 0,
  }));
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.floor((value - minimum) / width));
    bins[index].count++;
  }
  return bins.map((bin) => ({
    label: `${bin.start.toLocaleString(undefined, { maximumFractionDigits: 1 })}–${bin.end.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
    value: bin.count,
  }));
}

function scatterData(config: ChartConfig, rows: DataRow[]): ChartDatum[] {
  if (!config.yColumn) return [];
  const data: ChartDatum[] = [];
  for (const row of rows) {
    const x = parseNumericValue(row[config.xColumn] ?? "");
    const y = parseNumericValue(row[config.yColumn] ?? "");
    if (x === undefined || y === undefined) continue;
    data.push({ label: `${x}, ${y}`, x, y });
    if (data.length >= 500) break;
  }
  return data;
}

export function buildChartData(config: ChartConfig, rows: DataRow[]): ChartDatum[] {
  if (config.type === "histogram") return histogramData(config, rows);
  if (config.type === "scatter") return scatterData(config, rows);
  return groupedData(config, rows);
}

export function recommendCharts(statistics: DatasetStatistics, maximum = 6): ChartRecommendation[] {
  const dimensions = statistics.columns.filter(
    ({ profile }) => profile.role === "dimension" && profile.distinct >= 2 && profile.distinct <= 30,
  );
  const dates = statistics.columns.filter(({ profile }) => profile.role === "temporal" && profile.type === "date");
  const measures = statistics.columns.filter(({ profile }) => profile.role === "measure" && profile.type === "number");
  const recommendations: ChartRecommendation[] = [];

  for (const date of dates.slice(0, 2)) {
    for (const measure of measures.slice(0, 2)) {
      const x = date.profile.column;
      const y = measure.profile.column;
      const aggregation = suggestedAggregation(y);
      recommendations.push({
        id: `recommended-line-${slug(x)}-${slug(y)}`,
        title: `${y} over time`,
        type: "line",
        xColumn: x,
        yColumn: y,
        aggregation,
        dateGranularity: "auto",
        source: "recommendation",
        confidence: 0.96,
        reason: `${x} is temporal and ${y} is a numeric measure, making change over time meaningful.`,
      });
    }
  }

  for (const dimension of dimensions.slice(0, 3)) {
    for (const measure of measures.slice(0, 2)) {
      const x = dimension.profile.column;
      const y = measure.profile.column;
      const aggregation = suggestedAggregation(y);
      recommendations.push({
        id: `recommended-bar-${slug(x)}-${slug(y)}`,
        title: `${y} by ${x}`,
        type: "bar",
        xColumn: x,
        yColumn: y,
        aggregation,
        limit: 12,
        source: "recommendation",
        confidence: 0.9,
        reason: `${x} is a reusable grouping dimension and ${y} is safe to aggregate.`,
      });
    }
  }

  for (const measure of measures.slice(0, 2)) {
    const x = measure.profile.column;
    recommendations.push({
      id: `recommended-histogram-${slug(x)}`,
      title: `Distribution of ${x}`,
      type: "histogram",
      xColumn: x,
      aggregation: "count",
      source: "recommendation",
      confidence: 0.82,
      reason: `${x} is numeric, so a histogram reveals its range, concentration, and potential extremes.`,
    });
  }

  if (measures.length >= 2) {
    const x = measures[0].profile.column;
    const y = measures[1].profile.column;
    recommendations.push({
      id: `recommended-scatter-${slug(x)}-${slug(y)}`,
      title: `${y} versus ${x}`,
      type: "scatter",
      xColumn: x,
      yColumn: y,
      aggregation: "average",
      source: "recommendation",
      confidence: 0.78,
      reason: `Both ${x} and ${y} are numeric measures, allowing their relationship to be inspected.`,
    });
  }

  for (const dimension of dimensions.slice(0, 2)) {
    const x = dimension.profile.column;
    recommendations.push({
      id: `recommended-count-${slug(x)}`,
      title: `Records by ${x}`,
      type: dimension.profile.distinct <= 6 ? "donut" : "bar",
      xColumn: x,
      aggregation: "count",
      limit: 12,
      source: "recommendation",
      confidence: 0.74,
      reason: `${x} has ${dimension.profile.distinct} recurring categories suitable for a frequency comparison.`,
    });
  }

  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maximum);
}
