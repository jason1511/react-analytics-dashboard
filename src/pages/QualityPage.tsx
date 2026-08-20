import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { analyseDataQuality, type QualityIssue, type QualitySeverity } from "../lib/quality";
import { calculateDatasetStatistics } from "../lib/statistics";
import { useDataset } from "../state/use-dataset";

function SeverityBadge({ severity }: { severity: QualitySeverity }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function AffectedRows({ issue, columns, rows }: { issue: QualityIssue; columns: string[]; rows: Record<string, string>[] }) {
  const visibleColumns = issue.column ? [issue.column] : columns.slice(0, 4);
  const indices = issue.rowIndices.slice(0, 10);
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Row</th>
            {visibleColumns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {indices.map((index) => (
            <tr key={index} className="text-slate-700 dark:text-slate-300">
              <td className="px-3 py-2 font-medium">{index + 1}</td>
              {visibleColumns.map((column) => (
                <td key={column} className="max-w-64 truncate px-3 py-2" title={rows[index]?.[column] || "(empty)"}>
                  {rows[index]?.[column] || <span className="italic text-slate-400">empty</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {issue.rowIndices.length > indices.length ? (
        <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Showing 10 of {issue.rowIndices.length.toLocaleString()} affected rows.
        </div>
      ) : null}
    </div>
  );
}

export default function QualityPage() {
  const { columns, rows, fileName, columnOverrides } = useDataset();
  const [severity, setSeverity] = useState<QualitySeverity | "all">("all");
  const [column, setColumn] = useState("all");
  const statistics = useMemo(
    () => calculateDatasetStatistics(columns, rows, columnOverrides),
    [columnOverrides, columns, rows],
  );
  const report = useMemo(
    () => analyseDataQuality(columns, rows, statistics),
    [columns, rows, statistics],
  );
  const filtered = report.issues.filter(
    (issue) =>
      (severity === "all" || issue.severity === severity) &&
      (column === "all" || issue.column === column),
  );

  if (!rows.length) {
    return (
      <EmptyState
        title="Data quality"
        description="No dataset loaded yet. Upload a CSV to check missing, duplicated, invalid, inconsistent, and unusual values."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Data quality</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? `${fileName} · ` : ""}Read-only checks; your original data is never changed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-2">
          <div className="text-sm text-slate-500 dark:text-slate-400">Quality score</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{report.score}</span>
            <span className="pb-1 text-sm text-slate-500 dark:text-slate-400">/ 100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${report.score >= 85 ? "bg-emerald-500" : report.score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${report.score}%` }}
            />
          </div>
        </div>
        {(["error", "warning", "info"] as QualitySeverity[]).map((level) => (
          <div key={level} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="capitalize text-sm text-slate-500 dark:text-slate-400">{level}s</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{report.counts[level]}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Severity
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as QualitySeverity | "all")}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All severities</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Information</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Column
            <select
              value={column}
              onChange={(event) => setColumn(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All columns</option>
              {columns.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {report.issues.length ? (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <article key={issue.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{issue.category}</span>
                    {issue.column ? <span className="text-xs text-slate-500 dark:text-slate-400">{issue.column}</span> : null}
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{issue.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{issue.description}</p>
                </div>
                <div className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {issue.affectedCount.toLocaleString()} affected
                </div>
              </div>
              {issue.examples.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {issue.examples.map((example) => (
                    <span key={example} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {example || "empty"}
                    </span>
                  ))}
                </div>
              ) : null}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">
                  Inspect affected rows
                </summary>
                <AffectedRows issue={issue} columns={columns} rows={rows} />
              </details>
            </article>
          ))}
          {!filtered.length ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No issues match the selected filters.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <h3 className="font-semibold">No quality issues detected</h3>
          <p className="mt-1 text-sm">The current automated checks found no missing, duplicated, invalid, inconsistent, constant, or unusual values.</p>
        </div>
      )}
    </div>
  );
}
