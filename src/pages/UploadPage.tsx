import { useRef, useState } from "react";
import Papa from "papaparse";
import { useDataset } from "../state/use-dataset";

export default function UploadPage() {
  const { setDataset, fileName, rows, columns, clear } = useDataset();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseFile(file: File) {
    setError(null);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = (results.data || []).filter(Boolean) as Record<string, unknown>[];
        const cols =
          results.meta.fields?.filter((f): f is string => typeof f === "string") ?? [];

        if (cols.length === 0) {
          setError("No columns detected. Make sure the first row is the header.");
          return;
        }

        // Convert everything to strings for now (simple & safe)
        const stringRows = data.map((r) => {
          const obj: Record<string, string> = {};
          for (const c of cols) obj[c] = r?.[c] == null ? "" : String(r[c]);
          return obj;
        });

        setDataset({ columns: cols, rows: stringRows, fileName: file.name });
      },
      error: (err) => setError(err.message),
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Upload Data
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload a CSV with headers. We’ll use it across Dashboard and Explore.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg border px-3 py-2 text-sm
                       bg-white hover:bg-slate-50
                       dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
                       dark:hover:bg-slate-800"
            onClick={() => inputRef.current?.click()}
          >
            Choose CSV
          </button>

          <button
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50
                       bg-white hover:bg-slate-50
                       dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200
                       dark:hover:bg-slate-800"
            onClick={clear}
            disabled={rows.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) parseFile(file);
        }}
      />

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          "rounded-2xl border p-6 shadow-sm transition",
          "bg-white dark:bg-slate-900 dark:border-slate-800",
          isDragging
            ? "ring-2 ring-blue-500"
            : "hover:border-slate-300 dark:hover:border-slate-700",
        ].join(" ")}
      >
        <div
          className="rounded-xl border-2 border-dashed p-10 text-center
                     border-slate-300 dark:border-slate-700"
        >
          {/* Supported format box */}
          <div
            className="mx-auto mb-6 max-w-3xl rounded-xl p-4 text-sm
                       bg-slate-50 text-slate-700
                       dark:bg-slate-800 dark:text-slate-200"
          >
            <div className="font-medium text-slate-900 dark:text-slate-100">
              Supported format
            </div>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
              <li>CSV files with a header row (first row = column names)</li>
              <li>Comma-separated values (UTF-8 recommended)</li>
              <li>Example columns: Date, Region, Category, Units, Revenue</li>
            </ul>

            <div className="mt-3">
              <span className="text-slate-600 dark:text-slate-300">
                Need a sample?
              </span>{" "}
              <a
                className="font-medium text-slate-900 underline hover:text-slate-700
                           dark:text-slate-100 dark:hover:text-slate-300"
                href="/sales_mock.csv"
                download
              >
                Download mock CSV
              </a>
            </div>
          </div>

          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Drop CSV here
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            or click “Choose CSV”
          </div>
        </div>

        {error && (
          <div
            className="mt-4 rounded-lg border p-3 text-sm
                       border-red-300 bg-red-50 text-red-700
                       dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">File</div>
            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {fileName ?? "—"}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Rows</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {rows.length}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Columns
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {columns.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
