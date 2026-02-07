import { useMemo, useState } from "react";
import { useDataset } from "../state/use-dataset";
import BarCountChart from "../components/charts/BarCountChart";

function getCategoryCounts(rows: Record<string, string>[], column: string) {
  const map = new Map<string, number>();

  for (const r of rows) {
    const key = (r[column] || "—").trim() || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15); // limit bars
}

export default function DashboardPage() {
  const { rows, columns, fileName } = useDataset();

  // Pick a default categorical column
  const [groupBy, setGroupBy] = useState<string>(() => columns[0] ?? "");

  const chartData = useMemo(() => {
    if (!groupBy || !rows.length) return [];
    return getCategoryCounts(rows, groupBy);
  }, [rows, groupBy]);

  if (!rows.length) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-600">
          No dataset loaded yet. Upload a CSV to see insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-600">
          {fileName ? `Loaded: ${fileName}` : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Rows</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Columns</p>
          <p className="text-2xl font-bold">{columns.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Distinct groups</p>
          <p className="text-2xl font-bold">{chartData.length}</p>
        </div>
      </div>

      {/* Chart controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="text-sm font-medium">Group rows by</div>
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

      {/* Chart */}
      <BarCountChart
        title={`Row count by "${groupBy}"`}
        data={chartData}
      />
    </div>
  );
}
