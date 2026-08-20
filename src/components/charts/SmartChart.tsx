import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildChartData, type ChartConfig } from "../../lib/charts";
import type { DataRow } from "../../lib/analytics";

const PIE_COLOURS = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#64748b"];

function compact(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");
  const absolute = Math.abs(number);
  if (absolute >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function shortened(value: string, maximum = 14) {
  return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}

const tooltipStyle = {
  background: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: 12,
  color: "var(--chart-tooltip-text)",
};

function StandardAxes({ rotate = false }: { rotate?: boolean }) {
  return (
    <>
      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        interval="preserveStartEnd"
        angle={rotate ? -30 : 0}
        textAnchor={rotate ? "end" : "middle"}
        height={rotate ? 58 : 36}
        tickFormatter={(value: string) => shortened(String(value), rotate ? 16 : 12)}
        tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
        axisLine={{ stroke: "var(--chart-axis-line)" }}
        tickLine={{ stroke: "var(--chart-axis-line)" }}
      />
      <YAxis
        width={56}
        tickFormatter={compact}
        tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
        axisLine={{ stroke: "var(--chart-axis-line)" }}
        tickLine={{ stroke: "var(--chart-axis-line)" }}
      />
    </>
  );
}

export default function SmartChart({
  config,
  rows,
  action,
  reason,
}: {
  config: ChartConfig;
  rows: DataRow[];
  action?: ReactNode;
  reason?: string;
}) {
  const data = buildChartData(config, rows);
  const rotate = data.length > 8 || data.some((datum) => datum.label.length > 14);
  const commonTooltip = (
    <Tooltip
      contentStyle={tooltipStyle}
      itemStyle={{ color: "var(--chart-tooltip-text)" }}
      labelStyle={{ color: "var(--chart-tooltip-text)" }}
      formatter={(value: unknown) => compact(value)}
    />
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={config.title}>
            {config.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {config.type} · {config.aggregation}{config.yColumn ? ` of ${config.yColumn}` : ""} by {config.xColumn}
          </p>
        </div>
        {action}
      </div>
      {reason ? <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400">{reason}</p> : null}

      {!data.length ? (
        <div className="flex h-72 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No compatible values to display
        </div>
      ) : (
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            {config.type === "line" ? (
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <StandardAxes />
                {commonTooltip}
                <Line type="monotone" dataKey="value" stroke="var(--chart-bar)" strokeWidth={2.5} dot={data.length <= 20} />
              </LineChart>
            ) : config.type === "area" ? (
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <StandardAxes />
                {commonTooltip}
                <Area type="monotone" dataKey="value" stroke="var(--chart-bar)" fill="var(--chart-bar)" fillOpacity={0.22} strokeWidth={2.5} />
              </AreaChart>
            ) : config.type === "donut" ? (
              <PieChart>
                {commonTooltip}
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="48%"
                  outerRadius="78%"
                  paddingAngle={2}
                >
                  {data.map((datum, index) => (
                    <Cell key={datum.label} fill={PIE_COLOURS[index % PIE_COLOURS.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : config.type === "scatter" ? (
              <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={config.xColumn}
                  tickFormatter={compact}
                  tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={config.yColumn}
                  width={56}
                  tickFormatter={compact}
                  tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
                />
                {commonTooltip}
                <Scatter data={data} fill="var(--chart-bar-accent)" />
              </ScatterChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: rotate ? 20 : 8 }}>
                <StandardAxes rotate={rotate} />
                {commonTooltip}
                <Bar dataKey="value" fill="var(--chart-bar)" radius={[8, 8, 2, 2]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
