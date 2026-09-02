import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CircleGauge,
  Columns3,
  Filter,
  Lightbulb,
  Pin,
  RotateCcw,
  Rows3,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import SmartChart from "../components/charts/SmartChart";
import EmptyState from "../components/EmptyState";
import { recommendCharts, type ChartRecommendation } from "../lib/charts";
import { filterDashboardRows } from "../lib/dashboard";
import { analyseDataQuality, type QualitySeverity } from "../lib/quality";
import { calculateDatasetStatistics } from "../lib/statistics";
import { useDataset } from "../state/use-dataset";

const controlClass =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function KpiCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={hint}>{hint}</p>
    </article>
  );
}

function DashboardChart({ recommendation, rows, pinned, onToggle }: { recommendation: ChartRecommendation; rows: Record<string, string>[]; pinned: boolean; onToggle: () => void }) {
  return (
    <SmartChart
      config={recommendation}
      rows={rows}
      reason={recommendation.reason}
      action={
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 sm:inline-flex">{Math.round(recommendation.confidence * 100)}% match</span>
          <button type="button" onClick={onToggle} aria-pressed={pinned} className={`inline-flex size-8 items-center justify-center rounded-lg border transition ${pinned ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"}`} title={pinned ? "Remove from pinned charts" : "Pin to dashboard"}>
            <Pin size={15} aria-hidden="true" />
          </button>
        </div>
      }
    />
  );
}

const severityStyle: Record<QualitySeverity, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

export default function DashboardPage() {
  const { rows, columns, columnOverrides, pinnedCharts, pinChart, unpinChart } = useDataset();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDimension, setSelectedDimension] = useState("");
  const [selectedValue, setSelectedValue] = useState("");

  const sourceStatistics = useMemo(
    () => calculateDatasetStatistics(columns, rows, columnOverrides),
    [columnOverrides, columns, rows],
  );
  const dateStatistic = sourceStatistics.columns.find(
    ({ profile, date }) => profile.role === "temporal" && Boolean(date),
  );
  const dimensions = useMemo(
    () => sourceStatistics.columns.filter(({ profile }) => profile.role === "dimension" && profile.distinct >= 2 && profile.distinct <= 50),
    [sourceStatistics.columns],
  );
  const dimensionName = dimensions.some(({ profile }) => profile.column === selectedDimension)
    ? selectedDimension
    : dimensions[0]?.profile.column ?? "";
  const dimensionValues = useMemo(
    () => dimensionName
      ? [...new Set(rows.map((row) => (row[dimensionName] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 100)
      : [],
    [dimensionName, rows],
  );
  const categoryValue = dimensionValues.includes(selectedValue) ? selectedValue : "";
  const filteredRows = useMemo(
    () => filterDashboardRows(rows, {
      dateColumn: dateStatistic?.profile.column,
      dateFrom,
      dateTo,
      categoryColumn: dimensionName,
      categoryValue,
    }),
    [categoryValue, dateFrom, dateStatistic?.profile.column, dateTo, dimensionName, rows],
  );
  const filteredStatistics = useMemo(
    () => calculateDatasetStatistics(columns, filteredRows, columnOverrides),
    [columnOverrides, columns, filteredRows],
  );
  const quality = useMemo(
    () => analyseDataQuality(columns, filteredRows, filteredStatistics),
    [columns, filteredRows, filteredStatistics],
  );
  const recommendations = useMemo(() => recommendCharts(sourceStatistics, 3), [sourceStatistics]);
  const filterCount = Number(Boolean(dateFrom || dateTo)) + Number(Boolean(categoryValue));
  const hasRows = filteredRows.length > 0;
  const qualityTone = quality.score >= 85 ? "text-emerald-600 dark:text-emerald-400" : quality.score >= 65 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setSelectedDimension("");
    setSelectedValue("");
  }

  if (!rows.length) {
    return <EmptyState title="Dashboard" description="No dataset loaded yet. Import a data file to see its key metrics, recommended charts, and quality summary." />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">A focused overview of structure, trends, and data health.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/insights" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><Lightbulb size={16} aria-hidden="true" /> View insights</Link>
          <Link to="/charts" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Build chart <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" aria-label="Dashboard filters">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="flex min-w-40 items-center gap-2 xl:self-center">
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Filter size={17} aria-hidden="true" /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scope the overview</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{filteredRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows</p>
            </div>
          </div>

          {dateStatistic?.date ? (
            <>
              <label className="min-w-36 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">From · {dateStatistic.profile.column}<input type="date" min={dateStatistic.date.earliest.slice(0, 10)} max={dateStatistic.date.latest.slice(0, 10)} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={controlClass} /></label>
              <label className="min-w-36 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">To · {dateStatistic.profile.column}<input type="date" min={dateStatistic.date.earliest.slice(0, 10)} max={dateStatistic.date.latest.slice(0, 10)} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={controlClass} /></label>
            </>
          ) : null}

          {dimensions.length ? (
            <>
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">Filter field<select value={dimensionName} onChange={(event) => { setSelectedDimension(event.target.value); setSelectedValue(""); }} className={controlClass}>{dimensions.map(({ profile }) => <option key={profile.column} value={profile.column}>{profile.column}</option>)}</select></label>
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">Value<select value={categoryValue} onChange={(event) => setSelectedValue(event.target.value)} className={controlClass}><option value="">All values</option>{dimensionValues.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          ) : null}

          <button type="button" onClick={resetFilters} disabled={!filterCount} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><RotateCcw size={15} aria-hidden="true" /> Reset</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dataset key metrics">
        <KpiCard icon={<Rows3 size={17} />} label="Rows" value={filteredRows.length.toLocaleString()} hint={filterCount ? `${rows.length.toLocaleString()} rows before filters` : "Available for analysis"} />
        <KpiCard icon={<Columns3 size={17} />} label="Columns" value={sourceStatistics.columnCount.toLocaleString()} hint={`${sourceStatistics.roleCounts.measure} measures · ${sourceStatistics.roleCounts.dimension} dimensions`} />
        <KpiCard icon={<CircleGauge size={17} />} label="Completeness" value={hasRows ? `${(filteredStatistics.completeness * 100).toFixed(1)}%` : "—"} hint={hasRows ? `${filteredStatistics.missingCells.toLocaleString()} missing cells` : "No rows match the filters"} />
        <KpiCard icon={<ShieldCheck size={17} />} label="Quality score" value={hasRows ? `${quality.score}/100` : "—"} hint={hasRows ? `${quality.issues.length} detected issue${quality.issues.length === 1 ? "" : "s"}` : "Reset filters to inspect quality"} />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div><h3 className="text-base font-semibold text-slate-950 dark:text-white">Recommended overview</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Charts are selected from detected roles and update with the filters above.</p></div>
          <Link to="/insights" className="hidden items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 sm:inline-flex dark:text-blue-400">All recommendations <ArrowRight size={14} /></Link>
        </div>

        {recommendations.length ? (
          <>
            <DashboardChart recommendation={recommendations[0]} rows={filteredRows} pinned={pinnedCharts.some(({ id }) => id === recommendations[0].id)} onToggle={() => pinnedCharts.some(({ id }) => id === recommendations[0].id) ? unpinChart(recommendations[0].id) : pinChart(recommendations[0])} />
            {recommendations.length > 1 ? <div className="grid gap-4 xl:grid-cols-2">{recommendations.slice(1).map((recommendation) => <DashboardChart key={recommendation.id} recommendation={recommendation} rows={filteredRows} pinned={pinnedCharts.some(({ id }) => id === recommendation.id)} onToggle={() => pinnedCharts.some(({ id }) => id === recommendation.id) ? unpinChart(recommendation.id) : pinChart(recommendation)} />)}</div> : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><SlidersHorizontal className="mx-auto text-slate-400" size={24} /><h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">No safe chart recommendation yet</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Confirm column roles in Profile or create a chart manually.</p></div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><ShieldCheck size={19} /></span><div><h3 className="font-semibold text-slate-950 dark:text-white">Data quality at a glance</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Quality checks reflect the current dashboard filters.</p></div></div>
          <div className="flex items-center gap-4"><div className="text-right"><p className={`text-2xl font-bold ${hasRows ? qualityTone : "text-slate-400"}`}>{hasRows ? quality.score : "—"}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">out of 100</p></div><Link to="/quality" className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Open report <ArrowRight size={14} /></Link></div>
        </div>

        {hasRows ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">{(["error", "warning", "info"] as QualitySeverity[]).map((severity) => <div key={severity} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"><span className="flex items-center gap-2 text-xs capitalize text-slate-600 dark:text-slate-300"><span className={`size-2 rounded-full ${severityStyle[severity]}`} />{severity}</span><span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{quality.counts[severity]}</span></div>)}</div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{quality.issues.length ? quality.issues.slice(0, 3).map((issue) => <div key={issue.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"><span className={`size-2 shrink-0 rounded-full ${severityStyle[issue.severity]}`} /><p className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{issue.title}</p><span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{issue.affectedCount.toLocaleString()} affected</span></div>) : <p className="py-4 text-sm text-emerald-600 dark:text-emerald-400">No quality issues detected in this view.</p>}</div>
          </div>
        ) : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">No rows match the current filters. Reset them to continue the analysis.</p>}
      </section>

      {pinnedCharts.length ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3"><div><h3 className="text-base font-semibold text-slate-950 dark:text-white">Pinned charts</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your saved views, scoped by the same dashboard filters.</p></div><span className="text-xs text-slate-500 dark:text-slate-400">{pinnedCharts.length}/12</span></div>
          <div className="grid gap-4 xl:grid-cols-2">{pinnedCharts.map((chart) => <SmartChart key={chart.id} config={chart} rows={filteredRows} action={<button type="button" onClick={() => unpinChart(chart.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Remove</button>} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
