import { useMemo } from "react";
import SmartChart from "../components/charts/SmartChart";
import EmptyState from "../components/EmptyState";
import { recommendCharts } from "../lib/charts";
import { calculateDatasetStatistics } from "../lib/statistics";
import { useDataset } from "../state/use-dataset";

export default function InsightsPage() {
  const { columns, rows, fileName, columnOverrides, pinnedCharts, pinChart, unpinChart } = useDataset();
  const statistics = useMemo(
    () => calculateDatasetStatistics(columns, rows, columnOverrides),
    [columnOverrides, columns, rows],
  );
  const recommendations = useMemo(() => recommendCharts(statistics), [statistics]);

  if (!rows.length) {
    return (
      <EmptyState
        title="Recommended insights"
        description="No dataset loaded yet. Import a data file to receive explainable chart recommendations."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Recommended insights
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {fileName ? `${fileName} · ` : ""}Deterministic recommendations based on detected column roles.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {recommendations.length} recommendations
        </div>
      </div>

      {recommendations.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {recommendations.map((recommendation) => {
            const pinned = pinnedCharts.some((chart) => chart.id === recommendation.id);
            return (
              <SmartChart
                key={recommendation.id}
                config={recommendation}
                rows={rows}
                reason={recommendation.reason}
                action={
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200 sm:inline-flex">
                      {Math.round(recommendation.confidence * 100)}% match
                    </span>
                    <button
                      onClick={() => (pinned ? unpinChart(recommendation.id) : pinChart(recommendation))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        pinned
                          ? "border-slate-300 bg-slate-900 text-white dark:border-slate-600 dark:bg-slate-100 dark:text-slate-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {pinned ? "Pinned" : "Add to dashboard"}
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">No safe recommendations yet</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Confirm column types in Profile, or use the manual chart builder for this dataset.
          </p>
        </div>
      )}
    </div>
  );
}
