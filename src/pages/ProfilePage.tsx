import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { formatNumber } from "../lib/analytics";
import type { AnalyticalRole, ColumnType } from "../lib/profiling";
import {
  calculateDatasetStatistics,
  type ColumnStatistics,
  type ValueFrequency,
} from "../lib/statistics";
import { useDataset } from "../state/use-dataset";

const COLUMN_TYPES: ColumnType[] = ["number", "date", "boolean", "category", "text", "empty"];
const ANALYTICAL_ROLES: AnalyticalRole[] = [
  "measure",
  "dimension",
  "temporal",
  "identifier",
  "description",
  "unknown",
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function defaultRole(type: ColumnType): AnalyticalRole {
  if (type === "number") return "measure";
  if (type === "date") return "temporal";
  if (type === "boolean" || type === "category") return "dimension";
  if (type === "text") return "description";
  return "unknown";
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "blue" }) {
  return (
    <span
      className={`inline-flex max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
        tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
          : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function summaryFor(statistics: ColumnStatistics) {
  if (statistics.identifier) {
    return `${(statistics.identifier.uniquePercentage * 100).toFixed(1)}% unique`;
  }
  if (statistics.numeric) return `Mean ${formatNumber(statistics.numeric.mean)}`;
  if (statistics.date) {
    return `${formatDate(statistics.date.earliest)} – ${formatDate(statistics.date.latest)}`;
  }
  if (statistics.frequencies?.length) {
    const top = statistics.frequencies[0];
    return `${top.value} (${(top.percentage * 100).toFixed(1)}%)`;
  }
  if (statistics.text) return `Average ${statistics.text.averageLength.toFixed(1)} characters`;
  return "No populated values";
}

function FrequencyList({ frequencies }: { frequencies: ValueFrequency[] }) {
  return (
    <div className="space-y-3">
      {frequencies.map((frequency) => (
        <div key={frequency.value}>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-200" title={frequency.value}>
              {frequency.value}
            </span>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {frequency.count.toLocaleString()} · {(frequency.percentage * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
              style={{ width: `${Math.max(2, frequency.percentage * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnDrawer({
  statistics,
  overridden,
  onClose,
  onTypeChange,
  onRoleChange,
  onReset,
}: {
  statistics: ColumnStatistics;
  overridden: boolean;
  onClose: () => void;
  onTypeChange: (type: ColumnType) => void;
  onRoleChange: (role: AnalyticalRole) => void;
  onReset: () => void;
}) {
  const { profile } = statistics;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${profile.column} profile`}>
      <button className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-label="Close column details" />
      <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Column profile</div>
            <h2 className="mt-1 break-words text-xl font-semibold text-slate-900 dark:text-slate-100">
              {profile.column}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">Type: {profile.type}</Badge>
              <Badge>Role: {profile.role}</Badge>
              <Badge>{Math.round(profile.confidence * 100)}% confidence</Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Close column details"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Classification</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{profile.reason}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Data type
                <select
                  value={profile.type}
                  onChange={(event) => onTypeChange(event.target.value as ColumnType)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  {COLUMN_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Analytical role
                <select
                  value={profile.role}
                  onChange={(event) => onRoleChange(event.target.value as AnalyticalRole)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  {ANALYTICAL_ROLES.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Corrections apply to the currently loaded dataset session.</span>
              {overridden ? (
                <button onClick={onReset} className="font-medium text-blue-700 hover:underline dark:text-blue-300">
                  Restore detection
                </button>
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Column health</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailMetric label="Populated" value={statistics.populatedCount.toLocaleString()} />
              <DetailMetric label="Missing" value={profile.missing.toLocaleString()} />
              <DetailMetric label="Distinct" value={profile.distinct.toLocaleString()} />
              <DetailMetric label="Complete" value={`${(profile.completeness * 100).toFixed(1)}%`} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                style={{ width: `${profile.completeness * 100}%` }}
              />
            </div>
          </section>

          {statistics.identifier ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Identifier statistics</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <DetailMetric label="Unique values" value={`${(statistics.identifier.uniquePercentage * 100).toFixed(1)}%`} />
                <DetailMetric label="Repeated values" value={statistics.identifier.duplicateValues.toLocaleString()} />
              </div>
            </section>
          ) : null}

          {statistics.numeric ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Numeric distribution</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailMetric label="Minimum" value={formatNumber(statistics.numeric.minimum)} />
                <DetailMetric label="Maximum" value={formatNumber(statistics.numeric.maximum)} />
                <DetailMetric label="Sum" value={formatNumber(statistics.numeric.sum)} />
                <DetailMetric label="Mean" value={formatNumber(statistics.numeric.mean)} />
                <DetailMetric label="Median" value={formatNumber(statistics.numeric.median)} />
                <DetailMetric label="Std. deviation" value={formatNumber(statistics.numeric.standardDeviation)} />
                <DetailMetric label="First quartile" value={formatNumber(statistics.numeric.firstQuartile)} />
                <DetailMetric label="Third quartile" value={formatNumber(statistics.numeric.thirdQuartile)} />
                <DetailMetric label="Zeros / negative" value={`${statistics.numeric.zeroCount} / ${statistics.numeric.negativeCount}`} />
              </div>
            </section>
          ) : null}

          {statistics.date ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Date range</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <DetailMetric label="Earliest" value={formatDate(statistics.date.earliest)} />
                <DetailMetric label="Latest" value={formatDate(statistics.date.latest)} />
              </div>
            </section>
          ) : null}

          {statistics.frequencies?.length ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Most common values</h3>
              <div className="mt-3"><FrequencyList frequencies={statistics.frequencies} /></div>
            </section>
          ) : null}

          {statistics.text ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Text lengths</h3>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <DetailMetric label="Minimum" value={`${statistics.text.minimumLength} chars`} />
                <DetailMetric label="Maximum" value={`${statistics.text.maximumLength} chars`} />
                <DetailMetric label="Average" value={`${statistics.text.averageLength.toFixed(1)} chars`} />
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Example values</h3>
            {profile.sampleValues.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.sampleValues.map((value) => <Badge key={value}>{value}</Badge>)}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No populated examples.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function ProfilePage() {
  const {
    columns,
    rows,
    fileName,
    columnOverrides,
    setColumnOverride,
    resetColumnOverride,
  } = useDataset();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ColumnType | "all">("all");
  const [roleFilter, setRoleFilter] = useState<AnalyticalRole | "all">("all");
  const [selectedColumn, setSelectedColumn] = useState<string>();

  const statistics = useMemo(
    () => calculateDatasetStatistics(columns, rows, columnOverrides),
    [columns, rows, columnOverrides],
  );
  const filtered = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return statistics.columns.filter(({ profile }) => {
      const matchesQuery = !normalisedQuery || profile.column.toLowerCase().includes(normalisedQuery);
      const matchesType = typeFilter === "all" || profile.type === typeFilter;
      const matchesRole = roleFilter === "all" || profile.role === roleFilter;
      return matchesQuery && matchesType && matchesRole;
    });
  }, [query, roleFilter, statistics.columns, typeFilter]);
  const selected = statistics.columns.find(({ profile }) => profile.column === selectedColumn);

  if (!rows.length) {
    return (
      <EmptyState
        title="Data profile"
        description="No dataset loaded yet. Upload a CSV to inspect every column and its statistics."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Data profile</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {fileName ? `${fileName} · ` : ""}{statistics.columnCount} columns · {statistics.rowCount.toLocaleString()} rows
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{statistics.missingCells.toLocaleString()} missing cells</Badge>
          <Badge>{statistics.duplicateRows.toLocaleString()} duplicate rows</Badge>
          <Badge tone="blue">{(statistics.completeness * 100).toFixed(1)}% complete</Badge>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Search columns
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by column name"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as ColumnType | "all")}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All types</option>
              {COLUMN_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Role
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as AnalyticalRole | "all")}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All roles</option>
              {ANALYTICAL_ROLES.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Showing {filtered.length} of {statistics.columnCount} columns. Select a column for complete statistics.
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Column</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Complete</th>
                <th className="px-4 py-3">Distinct</th>
                <th className="px-4 py-3">Statistical summary</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((column) => {
                const { profile } = column;
                return (
                  <tr
                    key={profile.column}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedColumn(profile.column)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedColumn(profile.column);
                      }
                    }}
                    className="cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:text-slate-300 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                  >
                    <td className="max-w-64 px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="truncate" title={profile.column}>{profile.column}</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone="blue">{profile.type}</Badge></td>
                    <td className="px-4 py-3"><Badge>{profile.role}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full bg-slate-900 dark:bg-slate-100" style={{ width: `${profile.completeness * 100}%` }} />
                        </div>
                        <span>{(profile.completeness * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{profile.distinct.toLocaleString()}</td>
                    <td className="max-w-64 px-4 py-3"><div className="truncate" title={summaryFor(column)}>{summaryFor(column)}</div></td>
                    <td className="px-4 py-3">{Math.round(profile.confidence * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          {filtered.map((column) => {
            const { profile } = column;
            return (
              <button
                key={profile.column}
                onClick={() => setSelectedColumn(profile.column)}
                className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900 dark:text-slate-100">{profile.column}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="blue">{profile.type}</Badge>
                      <Badge>{profile.role}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{(profile.completeness * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">{summaryFor(column)}</div>
              </button>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No columns match the current search and filters.
          </div>
        ) : null}
      </div>

      {selected ? (
        <ColumnDrawer
          statistics={selected}
          overridden={Boolean(columnOverrides[selected.profile.column])}
          onClose={() => setSelectedColumn(undefined)}
          onTypeChange={(type) =>
            setColumnOverride(selected.profile.column, { type, role: defaultRole(type) })
          }
          onRoleChange={(role) => setColumnOverride(selected.profile.column, { role })}
          onReset={() => resetColumnOverride(selected.profile.column)}
        />
      ) : null}
    </div>
  );
}
