import { useMemo, useState } from "react";
import SmartChart from "../components/charts/SmartChart";
import EmptyState from "../components/EmptyState";
import {
  type Aggregation,
  type ChartConfig,
  type ChartType,
  type DateGranularity,
} from "../lib/charts";
import { calculateDatasetStatistics } from "../lib/statistics";
import { useDataset } from "../state/use-dataset";

const CHART_TYPES: Array<{ value: ChartType; label: string }> = [
  { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart" },
  { value: "area", label: "Area chart" },
  { value: "donut", label: "Donut chart" },
  { value: "histogram", label: "Histogram" },
  { value: "scatter", label: "Scatter plot" },
];
const AGGREGATIONS: Array<{ value: Aggregation; label: string }> = [
  { value: "count", label: "Count records" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "minimum", label: "Minimum" },
  { value: "maximum", label: "Maximum" },
];

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        {children}
      </select>
    </label>
  );
}

export default function ChartBuilderPage() {
  const { columns, rows, fileName, columnOverrides, pinChart, pinnedCharts } = useDataset();
  const statistics = useMemo(
    () => calculateDatasetStatistics(columns, rows, columnOverrides),
    [columnOverrides, columns, rows],
  );
  const measures = statistics.columns
    .filter(({ profile }) => profile.type === "number" && profile.role === "measure")
    .map(({ profile }) => profile.column);
  const dimensions = statistics.columns
    .filter(({ profile }) => profile.role === "dimension")
    .map(({ profile }) => profile.column);
  const dates = statistics.columns
    .filter(({ profile }) => profile.type === "date" && profile.role === "temporal")
    .map(({ profile }) => profile.column);

  const availability: Record<ChartType, boolean> = {
    bar: dimensions.length > 0 || dates.length > 0,
    line: dates.length > 0 && measures.length > 0,
    area: dates.length > 0 && measures.length > 0,
    donut: dimensions.length > 0,
    histogram: measures.length > 0,
    scatter: measures.length > 1,
  };
  const [type, setType] = useState<ChartType>("bar");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [aggregation, setAggregation] = useState<Aggregation>("sum");
  const [granularity, setGranularity] = useState<DateGranularity>("auto");
  const [limit, setLimit] = useState(12);
  const [title, setTitle] = useState("Custom analysis");
  const [notice, setNotice] = useState("");

  const chartType = availability[type]
    ? type
    : (CHART_TYPES.find((option) => availability[option.value])?.value ?? type);

  const xOptions = useMemo(() => {
    if (chartType === "line" || chartType === "area") return dates;
    if (chartType === "histogram" || chartType === "scatter") return measures;
    if (chartType === "donut") return dimensions;
    return [...new Set([...dimensions, ...dates])];
  }, [chartType, dates, dimensions, measures]);
  const effectiveX = xOptions.includes(xColumn) ? xColumn : (xOptions[0] ?? "");
  const needsY = chartType === "line" || chartType === "area" || chartType === "scatter";
  const supportsY = chartType === "bar" || chartType === "donut" || needsY;
  const effectiveY = needsY
    ? measures.includes(yColumn) && (chartType !== "scatter" || yColumn !== effectiveX)
      ? yColumn
      : (measures.find((measure) => measure !== effectiveX) ?? measures[0] ?? "")
    : supportsY && measures.includes(yColumn)
      ? yColumn
      : "";
  const effectiveAggregation: Aggregation =
    chartType === "histogram" || chartType === "scatter" || (!effectiveY && !needsY)
      ? "count"
      : aggregation;

  const validation = (() => {
    if (!effectiveX) return "This dataset has no compatible X-axis column for the selected chart.";
    if (needsY && !effectiveY) return "Select a numeric Y-axis measure.";
    if (chartType === "scatter" && effectiveX === effectiveY) return "Scatter plots require two different numeric measures.";
    if ((chartType === "bar" || chartType === "donut") && effectiveAggregation !== "count" && !effectiveY) {
      return "Select a numeric measure or use Count records.";
    }
    return "";
  })();

  const preview: ChartConfig = {
    id: "builder-preview",
    title: title.trim() || "Untitled chart",
    type: chartType,
    xColumn: effectiveX,
    yColumn: supportsY && effectiveY ? effectiveY : undefined,
    aggregation: effectiveAggregation,
    dateGranularity: granularity,
    limit,
    source: "custom",
  };

  if (!rows.length) {
    return (
      <EmptyState
        title="Chart builder"
        description="No dataset loaded yet. Upload a CSV to create and pin custom visualisations."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Chart builder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {fileName ? `${fileName} · ` : ""}Build a chart from confirmed dimensions, dates, and measures.
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {pinnedCharts.length}/12 dashboard slots used
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Configuration</h3>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Chart title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <SelectField label="Chart type" value={chartType} onChange={(value) => setType(value as ChartType)}>
              {CHART_TYPES.map((option) => (
                <option key={option.value} value={option.value} disabled={!availability[option.value]}>
                  {option.label}{availability[option.value] ? "" : " — unavailable"}
                </option>
              ))}
            </SelectField>

            <SelectField label="X-axis" value={effectiveX} onChange={setXColumn} disabled={!xOptions.length}>
              {!xOptions.length ? <option value="">No compatible columns</option> : null}
              {xOptions.map((column) => <option key={column}>{column}</option>)}
            </SelectField>

            {supportsY ? (
              <SelectField label={needsY ? "Y-axis" : "Y-axis (optional)"} value={effectiveY} onChange={setYColumn}>
                {!needsY ? <option value="">None — count records</option> : null}
                {measures.map((column) => <option key={column}>{column}</option>)}
              </SelectField>
            ) : null}

            {chartType !== "histogram" && chartType !== "scatter" ? (
              <SelectField
                label="Aggregation"
                value={effectiveAggregation}
                onChange={(value) => setAggregation(value as Aggregation)}
                disabled={!effectiveY}
              >
                {AGGREGATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            ) : null}

            {chartType === "line" || chartType === "area" ? (
              <SelectField label="Date grouping" value={granularity} onChange={(value) => setGranularity(value as DateGranularity)}>
                <option value="auto">Automatic</option>
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </SelectField>
            ) : null}

            {chartType === "bar" || chartType === "donut" ? (
              <SelectField label="Maximum groups" value={String(limit)} onChange={(value) => setLimit(Number(value))}>
                {[5, 10, 12, 15, 25].map((value) => <option key={value}>{value}</option>)}
              </SelectField>
            ) : null}

            {validation ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {validation}
              </div>
            ) : null}

            <button
              disabled={Boolean(validation)}
              onClick={() => {
                const id = `custom-${crypto.randomUUID()}`;
                pinChart({ ...preview, id, source: "custom" });
                setNotice("Chart added to the dashboard.");
              }}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Add to dashboard
            </button>
            {notice ? <p className="text-center text-xs text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
          </div>
        </section>

        <div className="min-w-0">
          <SmartChart
            config={preview}
            rows={validation ? [] : rows}
            reason="Live preview. The original dataset is not modified."
          />
        </div>
      </div>
    </div>
  );
}
