import { useEffect, useMemo, useState } from "react";
import { useDataset } from "../state/use-dataset";
import BarCountChart from "../components/charts/BarCountChart";
import EmptyState from "../components/EmptyState";

/* ---------- helpers ---------- */

function getCategoryCounts(rows: Record<string, string>[], column: string) {
  const map = new Map<string, number>();

  for (const r of rows) {
    const key = (r[column] || "—").trim() || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

function isNumericLike(v: string) {
  const s = (v ?? "").trim();
  if (!s) return false;
  const cleaned = s.replace(/[$£€,\s]/g, "");
  return cleaned !== "" && !Number.isNaN(Number(cleaned));
}

function toNumberSafe(v: string) {
  const cleaned = (v ?? "").trim().replace(/[$£€,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function detectNumericColumns(
  columns: string[],
  rows: Record<string, string>[],
  sampleSize = 60
) {
  const sample = rows.slice(0, sampleSize);
  const numeric: string[] = [];

  for (const c of columns) {
    let seen = 0;
    let ok = 0;

    for (const r of sample) {
      const v = r[c] ?? "";
      if (v.trim() === "") continue;
      seen++;
      if (isNumericLike(v)) ok++;
    }

    if (seen > 0 && ok / seen >= 0.8) numeric.push(c);
  }

  return numeric;
}

function sumByGroup(
  rows: Record<string, string>[],
  groupCol: string,
  valueCol: string
) {
  const map = new Map<string, number>();

  for (const r of rows) {
    const key = (r[groupCol] || "—").trim() || "—";
    const val = toNumberSafe(r[valueCol] ?? "");
    map.set(key, (map.get(key) ?? 0) + val);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

/* ---------- page ---------- */

export default function DashboardPage() {
  const { rows, columns, fileName } = useDataset();

  const numericCols = useMemo(
    () => detectNumericColumns(columns, rows),
    [columns, rows]
  );

  // defaults (will be set after CSV loads)
  const [groupBy, setGroupBy] = useState<string>("");
  const [mode, setMode] = useState<"count" | "sum">("count");
  const [valueCol, setValueCol] = useState<string>("");

  // Keep defaults in sync when dataset changes
  useEffect(() => {
    if (!columns.length) {
      setGroupBy("");
      setValueCol("");
      setMode("count");
      return;
    }

    // If current groupBy missing, set first column
    if (!groupBy || !columns.includes(groupBy)) setGroupBy(columns[0]);

    // If sum mode but no numeric columns, fall back to count
    if (mode === "sum" && numericCols.length === 0) setMode("count");

    // Ensure valueCol is a valid numeric col
    if (numericCols.length > 0) {
      if (!valueCol || !numericCols.includes(valueCol)) setValueCol(numericCols[0]);
    } else {
      setValueCol("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, numericCols.join("|")]);

  const chartData = useMemo(() => {
    if (!groupBy || !rows.length) return [];

    if (mode === "sum" && valueCol) {
      return sumByGroup(rows, groupBy, valueCol);
    }
    return getCategoryCounts(rows, groupBy);
  }, [rows, groupBy, mode, valueCol]);

  if (!rows.length) {
    return (
      <div className="space-y-2">
        <EmptyState
          title="Dashboard"
          description="No dataset loaded yet. Upload a CSV to see summary stats and charts."
        />
      </div>
    );
  }

  const distinctGroups = groupBy
    ? new Set(rows.map((r) => (r[groupBy] || "—").trim() || "—")).size
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-600">{fileName ? `Loaded: ${fileName}` : ""}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Rows" value={rows.length.toLocaleString()} />
        <KpiCard label="Columns" value={columns.length.toString()} />
        <KpiCard label="Distinct groups" value={distinctGroups.toLocaleString()} />
        <KpiCard label="Numeric columns" value={numericCols.length.toString()} />
      </div>

      {/* Chart controls */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">Chart</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-56"
                value={mode}
                onChange={(e) => setMode(e.target.value as "count" | "sum")}
              >
                <option value="count">Count rows</option>
                <option value="sum" disabled={numericCols.length === 0}>
                  Sum numeric column
                </option>
              </select>

              {mode === "sum" && (
                <select
                  className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-64"
                  value={valueCol}
                  onChange={(e) => setValueCol(e.target.value)}
                  disabled={numericCols.length === 0}
                  title={numericCols.length === 0 ? "No numeric columns detected" : ""}
                >
                  {numericCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">Group by</div>
            <select
              className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-64"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mode === "sum" && numericCols.length === 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No numeric columns detected, so “Sum numeric column” is disabled.
          </div>
        )}
      </div>

      {/* Chart */}
      <BarCountChart
        title={
          mode === "sum" && valueCol
            ? `Sum of "${valueCol}" by "${groupBy}"`
            : `Row count by "${groupBy}"`
        }
        data={chartData}
      />
    </div>
  );
}
