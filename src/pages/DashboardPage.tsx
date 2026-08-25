import { useEffect, useMemo, useState } from "react";
import { useDataset } from "../state/use-dataset";
import BarCountChart from "../components/charts/BarCountChart";
import SmartChart from "../components/charts/SmartChart";
import EmptyState from "../components/EmptyState";
import {
  formatNumber,
  getCategoryCounts,
  pickDefaultGroupBy,
  sumByGroup,
} from "../lib/analytics";
import {
  calculateDatasetStatistics,
  type ColumnStatistics,
} from "../lib/statistics";

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Statistic({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div
        className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-slate-200"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ColumnStatisticGrid({ statistics }: { statistics: ColumnStatistics }) {
  const { profile } = statistics;

  if (statistics.identifier) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Statistic
          label="Unique"
          value={`${(statistics.identifier.uniquePercentage * 100).toFixed(1)}%`}
        />
        <Statistic
          label="Repeated values"
          value={statistics.identifier.duplicateValues.toLocaleString()}
        />
      </div>
    );
  }

  if (statistics.numeric) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Statistic label="Minimum" value={formatNumber(statistics.numeric.minimum)} />
        <Statistic label="Maximum" value={formatNumber(statistics.numeric.maximum)} />
        <Statistic label="Mean" value={formatNumber(statistics.numeric.mean)} />
        <Statistic label="Median" value={formatNumber(statistics.numeric.median)} />
      </div>
    );
  }

  if (statistics.date) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Statistic label="Earliest" value={formatDate(statistics.date.earliest)} />
        <Statistic label="Latest" value={formatDate(statistics.date.latest)} />
      </div>
    );
  }

  if (statistics.frequencies?.length) {
    const top = statistics.frequencies[0];
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Statistic label="Most common" value={top.value} />
        <Statistic label="Share" value={`${(top.percentage * 100).toFixed(1)}%`} />
      </div>
    );
  }

  if (statistics.text) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Statistic label="Average length" value={`${statistics.text.averageLength.toFixed(1)} chars`} />
        <Statistic
          label="Length range"
          value={`${statistics.text.minimumLength}–${statistics.text.maximumLength}`}
        />
      </div>
    );
  }

  return (
    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
      {profile.type === "empty" ? "No populated values." : "No additional statistics available."}
    </p>
  );
}

/* ---------- page ---------- */

export default function DashboardPage() {
  const { rows, columns, fileName, columnOverrides, pinnedCharts, unpinChart } = useDataset();

  const datasetStatistics = useMemo(
    () => calculateDatasetStatistics(columns, rows, columnOverrides),
    [columns, rows, columnOverrides],
  );
  const numericCols = useMemo(
    () =>
      datasetStatistics.columns
        .filter(({ profile }) => profile.type === "number" && profile.role === "measure")
        .map(({ profile }) => profile.column),
    [datasetStatistics.columns],
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

  const colSummary = useMemo(() => {
    // Show most “useful” columns first: low missing + reasonable distinct counts
    return [...datasetStatistics.columns]
      .sort((a, b) => {
        const aProfile = a.profile;
        const bProfile = b.profile;
        const aScore =
          (aProfile.role === "measure" || aProfile.role === "dimension" || aProfile.role === "temporal" ? 2 : 1) +
          (1 - aProfile.missing / Math.max(1, rows.length)) +
          (aProfile.distinct >= 2 && aProfile.distinct <= 30 ? 1 : 0);
        const bScore =
          (bProfile.role === "measure" || bProfile.role === "dimension" || bProfile.role === "temporal" ? 2 : 1) +
          (1 - bProfile.missing / Math.max(1, rows.length)) +
          (bProfile.distinct >= 2 && bProfile.distinct <= 30 ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [datasetStatistics.columns, rows.length]);

  if (!rows.length) {
    return (
      <EmptyState
        title="Dashboard"
        description="No dataset loaded yet. Import a data file to see summary stats and charts."
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
        <KpiCard label="Rows" value={datasetStatistics.rowCount.toLocaleString()} />
        <KpiCard label="Columns" value={datasetStatistics.columnCount.toString()} />
        <KpiCard
          label="Measures"
          value={numericCols.length.toString()}
          hint="Numeric fields safe to aggregate"
        />
        <KpiCard label="Date columns" value={datasetStatistics.typeCounts.date.toString()} />
        <KpiCard
          label="Missing cells"
          value={datasetStatistics.missingCells.toLocaleString()}
          hint={`of ${datasetStatistics.totalCells.toLocaleString()} cells`}
        />
        <KpiCard
          label="Completeness"
          value={(datasetStatistics.completeness * 100).toFixed(1) + "%"}
          hint="Higher is better"
        />
      </div>

      {pinnedCharts.length ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pinned dashboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recommended and custom charts saved for the current dataset session.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {pinnedCharts.length} chart{pinnedCharts.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {pinnedCharts.map((chart) => (
              <SmartChart
                key={chart.id}
                config={chart}
                rows={rows}
                action={
                  <button
                    onClick={() => unpinChart(chart.id)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Remove
                  </button>
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Dataset-level statistics */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Dataset snapshot
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Statistical structure across the complete loaded dataset.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Statistic
              label="Populated cells"
              value={datasetStatistics.populatedCells.toLocaleString()}
            />
            <Statistic
              label="Duplicate rows"
              value={datasetStatistics.duplicateRows.toLocaleString()}
            />
            <Statistic
              label="Date coverage"
              value={
                datasetStatistics.dateCoverage
                  ? `${formatDate(datasetStatistics.dateCoverage.earliest)} – ${formatDate(datasetStatistics.dateCoverage.latest)}`
                  : "Not detected"
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Detected types
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(datasetStatistics.typeCounts)
                .filter(([, count]) => count > 0)
                .map(([type, count]) => <Chip key={type}>{type}: {count}</Chip>)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Analytical roles
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(datasetStatistics.roleCounts)
                .filter(([, count]) => count > 0)
                .map(([role, count]) => <Chip key={role}>{role}: {count}</Chip>)}
            </div>
          </div>
        </div>
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
              Column statistics preview
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Type-aware statistics for the six most analytically useful columns.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {colSummary.map((statistics) => {
            const c = statistics.profile;
            return (
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

                <ColumnStatisticGrid statistics={statistics} />

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
            );
          })}
        </div>
      </div>
    </div>
  );
}
