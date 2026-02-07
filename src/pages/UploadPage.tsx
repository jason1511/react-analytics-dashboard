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

        // Convert everything to strings for now (simple & safe)
        const stringRows = data.map((r) => {
          const obj: Record<string, string> = {};
          for (const c of cols) obj[c] = r?.[c] == null ? "" : String(r[c]);
          return obj;
        });

        if (cols.length === 0) {
          setError("No columns detected. Make sure the first row is the header.");
          return;
        }

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
          <h2 className="text-xl font-semibold">Upload Data</h2>
          <p className="text-sm text-slate-600">
            Upload a CSV with headers. We’ll use it across Dashboard and Explore.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => inputRef.current?.click()}
          >
            Choose CSV
          </button>
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
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
          "rounded-2xl border bg-white p-6 shadow-sm",
          isDragging ? "ring-2 ring-slate-900" : "",
        ].join(" ")}
      >
        <div className="rounded-xl border-2 border-dashed p-10 text-center">
          <div className="text-sm font-medium">Drop CSV here</div>
          <div className="mt-1 text-sm text-slate-500">
            or click “Choose CSV”
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">File</div>
            <div className="truncate text-sm font-medium">{fileName ?? "—"}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Rows</div>
            <div className="text-sm font-medium">{rows.length}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Columns</div>
            <div className="text-sm font-medium">{columns.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
