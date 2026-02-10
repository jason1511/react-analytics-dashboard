import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Datum = { label: string; value: number };

type Props = {
  data: Datum[];
  title: string;
  variant?: "primary" | "accent";
};

function formatCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function clampLabel(s: string, max = 14) {
  const str = (s ?? "").toString();
  if (str.length <= max) return str;
  return str.slice(0, Math.max(0, max - 1)) + "…";
}

export default function BarCountChart({ data, title, variant = "primary" }: Props) {
  const longest = data.length ? Math.max(...data.map((d) => (d.label ?? "").length)) : 0;
  const shouldRotate = data.length > 8 || longest > 12;

  const barColor =
    variant === "accent" ? "var(--chart-bar-accent)" : "var(--chart-bar)";

  if (!data.length) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow dark:bg-slate-900 dark:border-slate-800">
        <div className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          {title}
        </div>
        <div className="flex h-72 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No data to display
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow dark:bg-slate-900 dark:border-slate-800">
      <div className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
        {title}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 12, left: 0, bottom: shouldRotate ? 22 : 8 }}
          >
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />

            <XAxis
              dataKey="label"
              interval={0}
              angle={shouldRotate ? -30 : 0}
              textAnchor={shouldRotate ? "end" : "middle"}
              height={shouldRotate ? 60 : 36}
              tickFormatter={(v: string) => clampLabel(v, shouldRotate ? 16 : 12)}
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              axisLine={{ stroke: "var(--chart-axis-line)" }}
              tickLine={{ stroke: "var(--chart-axis-line)" }}
            />

            <YAxis
              width={56}
              tickFormatter={formatCompact}
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              axisLine={{ stroke: "var(--chart-axis-line)" }}
              tickLine={{ stroke: "var(--chart-axis-line)" }}
            />

            <Tooltip
              cursor={{ fill: "var(--chart-hover)" }}
              contentStyle={{
                background: "var(--chart-tooltip-bg)",
                border: "1px solid var(--chart-tooltip-border)",
                borderRadius: 12,
                color: "var(--chart-tooltip-text)",
              }}
              itemStyle={{ color: "var(--chart-tooltip-text)" }}
              labelStyle={{ color: "var(--chart-tooltip-text)" }}
              formatter={(value: unknown) => {
                const n = typeof value === "number" ? value : Number(value);
                return [formatCompact(Number.isFinite(n) ? n : 0), "Value"];
              }}
              labelFormatter={(label) => `Group: ${label}`}
            />

            <Bar dataKey="value" radius={[10, 10, 4, 4]} fill={barColor} isAnimationActive>
              {/* subtle "top bar" highlight using opacity */}
              {data.map((_, idx) => (
                <Cell key={idx} fill={barColor} fillOpacity={idx === 0 ? 1 : 0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {longest > 12 && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Labels are truncated. Hover a bar to see the full group name.
        </div>
      )}
    </div>
  );
}
