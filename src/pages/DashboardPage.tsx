import { useEffect, useMemo, useState } from "react";
import { useDataset } from "../state/use-dataset";
import BarCountChart from "../components/charts/BarCountChart";
import EmptyState from "../components/EmptyState";
import {
  detectNumericColumns,
  formatNumber,
  getCategoryCounts,
  pickDefaultGroupBy,
  sumByGroup,
} from "../lib/analytics";
import { profileColumns } from "../lib/profiling";

/* ---------- presentational helpers ---------- */

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {children}
    </span>
  );
}

/* ---------- page ---------- */

export default function DashboardPage() {
  const { rows, columns, fileName } = useDataset();

  const numericCols = useMemo(
    () => detectNumericColumns(columns, rows),
    [columns, rows]
  );

  const profiles = useMemo(() => profileColumns(columns, rows), [columns, rows]);
  const dateColumnCount = useMemo(
    () => profiles.filter((profile) => profile.type === "date").length,
    [profiles],
  );

  const [groupBy, setGroupBy] = useState("");
  const [valueCol, setValueCol] = useState("");

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
      if (!valueCol || !numericCols.includes(valueCol)) setValueCol(numericCols[0]);
    } else {
      setValueCol("");
    }
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

  const quality = useMemo(() => {
    const totalCells = rows.length * columns.length;
    if (!totalCells) return { totalCells: 0, missingCells: 0, completeness: 0 };

    let missingCells = 0;
    for (const r of rows) {
      for (const c of columns) {
        if (!(r[c] ?? "").trim()) missingCells++;
      }
    }

    const completeness = (totalCells - missingCells) / totalCells;
    return { totalCells, missingCells, completeness };
  }, [rows, columns]);

  const colSummary = useMemo(() => {
    // Show most “useful” columns first: low missing + reasonable distinct counts
    return [...profiles]
      .sort((a, b) => {
        const aScore =
          (a.role === "measure" || a.role === "dimension" || a.role === "temporal" ? 2 : 1) +
          (1 - a.missing / Math.max(1, rows.length)) +
          (a.distinct >= 2 && a.distinct <= 30 ? 1 : 0);
        const bScore =
          (b.role === "measure" || b.role === "dimension" || b.role === "temporal" ? 2 : 1) +
          (1 - b.missing / Math.max(1, rows.length)) +
          (b.distinct >= 2 && b.distinct <= 30 ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [profiles, rows.length]);

  if (!rows.length) {
    return (
      <EmptyState
        title="Dashboard"
        description="No dataset loaded yet. Upload a CSV to see summary stats and charts."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Dashboard
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? `Loaded: ${fileName}` : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard label="Rows" value={rows.length.toLocaleString()} />
        <KpiCard label="Columns" value={columns.length.toString()} />
        <KpiCard
          label="Measures"
          value={numericCols.length.toString()}
          hint="Numeric fields safe to aggregate"
        />
        <KpiCard label="Date columns" value={dateColumnCount.toString()} />
        <KpiCard
          label="Missing cells"
          value={quality.missingCells.toLocaleString()}
          hint={`of ${quality.totalCells.toLocaleString()} cells`}
        />
        <KpiCard
          label="Completeness"
          value={(quality.completeness * 100).toFixed(1) + "%"}
          hint="Higher is better"
        />
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
                <option key={c} value={c}>{c}</option>
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
                  <option key={c} value={c}>{c}</option>
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip>{groupBy || "—"}</Chip>
              <Chip>{valueCol || "No numeric"}</Chip>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarCountChart title={`Row count by "${groupBy}"`} data={countData} variant="primary" />
        <BarCountChart
          title={valueCol ? `Sum of "${valueCol}" by "${groupBy}"` : "Sum chart (no numeric columns)"}
          data={valueCol ? sumData : []}
          variant="accent"
        />
      </div>

      {/* Column summary */}
      <div className="rounded-xl border bg-white p-4 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Column summary
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Inferred physical types and analytical roles, with an explanation for each decision.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {colSummary.map((c) => (
            <div
              key={c.column}
              className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.column}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Chip>Type: {c.type}</Chip>
                    <Chip>Role: {c.role}</Chip>
                    <Chip>{c.distinct.toLocaleString()} distinct</Chip>
                    <Chip>{c.missing.toLocaleString()} missing</Chip>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  {Math.round(c.confidence * 100)}% confidence
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {c.reason}
              </p>

              {c.sampleValues.length ? (
                <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
                  Examples: {c.sampleValues.join(" · ")}
                </p>
              ) : null}

              {/* completeness bar */}
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                title={`${Math.round(c.completeness * 100)}% complete`}
              >
                <div
                  className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                  style={{ width: `${Math.round(c.completeness * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
