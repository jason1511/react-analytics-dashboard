import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteDataset,
  listDatasets,
  loadDatasetContent,
  type DatasetSummary,
} from "../api/datasets";
import { parseCsvText } from "../lib/csv";
import { useDataset } from "../state/use-dataset";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DatasetsPage() {
  const { setDataset } = useDataset();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await listDatasets();
      setDatasets(response.items);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Datasets could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openDataset(dataset: DatasetSummary) {
    setBusyId(dataset.id);
    setError(null);
    try {
      const content = await loadDatasetContent(dataset.id);
      const parsed = parseCsvText(content);
      setDataset({
        datasetId: dataset.id,
        columns: parsed.columns,
        rows: parsed.rows,
        fileName: dataset.originalFileName,
      });
      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The dataset could not be opened."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeDataset(dataset: DatasetSummary) {
    if (!window.confirm(`Delete “${dataset.name}”? This cannot be undone.`)) return;

    setBusyId(dataset.id);
    setError(null);
    try {
      await deleteDataset(dataset.id);
      setDatasets((current) => current.filter((item) => item.id !== dataset.id));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The dataset could not be deleted."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Datasets
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reopen previously uploaded data or remove datasets you no longer need.
          </p>
        </div>
        <Link
          to="/upload"
          className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Upload dataset
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading datasets…
        </div>
      ) : datasets.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="font-medium text-slate-900 dark:text-slate-100">
            No saved datasets yet
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload a CSV to create your first persistent dataset.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {datasets.map((dataset) => {
            const busy = busyId === dataset.id;
            return (
              <article
                key={dataset.id}
                className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {dataset.name}
                    </h3>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {dataset.originalFileName}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {dataset.status}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Rows</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {dataset.rowCount?.toLocaleString() ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Columns</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {dataset.columnCount ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Size</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {formatBytes(dataset.sizeBytes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Uploaded</dt>
                    <dd className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(dataset.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    onClick={() => void openDataset(dataset)}
                    disabled={busyId !== null}
                  >
                    {busy ? "Working…" : "Open"}
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                    onClick={() => void removeDataset(dataset)}
                    disabled={busyId !== null}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
