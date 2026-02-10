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

function pickDefaultGroupBy(columns: string[], rows: Record<string, string>[]) {
  if (!columns.length || !rows.length) return columns[0] ?? "";

  const candidates = columns
    .map((c) => {
      const set = new Set<string>();
      let nonEmpty = 0;

      for (const r of rows) {
        const v = (r[c] ?? "").trim();
        if (!v) continue;
        nonEmpty++;
        set.add(v);
        if (set.size > 50) break;
      }

      const distinct = set.size;
      const distinctRatio = nonEmpty ? distinct / nonEmpty : 1;

      const name = c.toLowerCase();
      const looksLikeDateOrId =
        name.includes("date") ||
        name.includes("time") ||
        name.includes("id") ||
        name.includes("timestamp");

      let score = 0;
      if (distinct >= 2) score += 1;
      if (distinct >= 5 && distinct <= 20) score += 3;
      if (distinctRatio > 0.9) score -= 3;
      if (looksLikeDateOrId) score -= 2;

      return { col: c, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.col ?? columns[0];
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

function formatNumber(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </p>
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

  const [groupBy, setGroupBy] = useState("");
  const [valueCol, setValueCol] = useState("");

  // pick defaults after CSV loads / changes
  useEffect(() => {
    if (!columns.length) {
      setGroupBy("");
      setValueCol("");
      return;
    }

    if (!groupBy || !columns.includes(groupBy)) {
      setGroupBy(pickDefaultGroupBy(columns, rows));
    }

    if (numericCols.length > 0) {
      if (!valueCol || !numericCols.includes(valueCol)) {
        setValueCol(numericCols[0]);
      }
    } else {
      setValueCol("");
    }
    // NOTE: keep your eslint disable if you want, but this is generally fine:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rows, numericCols.join("|")]);

  const countData = useMemo(() => {
    if (!groupBy || !rows.length) return [];
    return getCategoryCounts(rows, groupBy);
  }, [rows, groupBy]);

  const sumData = useMemo(() => {
    if (!groupBy || !rows.length || !valueCol) return [];
    return sumByGroup(rows, groupBy, valueCol);
  }, [rows, groupBy, valueCol]);

  const distinctGroups = useMemo(() => {
    if (!groupBy || !rows.length) return 0;
    return new Set(rows.map((r) => (r[groupBy] || "—").trim() || "—")).size;
  }, [rows, groupBy]);

  if (!rows.length) {
    return (
      <EmptyState
        title="Dashboard"
        description="No dataset loaded yet. Upload a CSV to see summary stats and charts."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Dashboard
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? `Loaded: ${fileName}` : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Rows" value={rows.length.toLocaleString()} />
        <KpiCard label="Columns" value={columns.length.toString()} />
        <KpiCard
          label="Distinct groups"
          value={distinctGroups.toLocaleString()}
        />
        <KpiCard label="Numeric columns" value={numericCols.length.toString()} />
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-white p-4 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Group by
            </div>
            <select
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 text-slate-900
                         dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
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

          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Sum column
            </div>
            <select
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white border-slate-200 text-slate-900 disabled:opacity-50
                         dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
              value={valueCol}
              onChange={(e) => setValueCol(e.target.value)}
              disabled={numericCols.length === 0}
            >
              {numericCols.length === 0 ? (
                <option value="">(No numeric columns)</option>
              ) : (
                numericCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Quick insight
            </div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {valueCol && sumData.length
                ? `Top: ${sumData[0].label} (${formatNumber(sumData[0].value)})`
                : countData.length
                ? `Top: ${countData[0].label} (${countData[0].value} rows)`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarCountChart
          title={`Row count by "${groupBy}"`}
          data={countData}
          variant="primary"
        />
        <BarCountChart
          title={
            valueCol
              ? `Sum of "${valueCol}" by "${groupBy}"`
              : "Sum chart (no numeric columns)"
          }
          data={valueCol ? sumData : []}
          variant="accent"
        />
      </div>

      {/* Top 5 table */}
      {valueCol && sumData.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Top 5 by {valueCol} (grouped by {groupBy})
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Group</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sumData.slice(0, 5).map((r) => (
                  <tr
                    key={r.label}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      {r.label}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                      {formatNumber(r.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
