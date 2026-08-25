import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDataset } from "../api/datasets";
import {
  createNormalizedCsvFile,
  DATA_FILE_ACCEPT,
  parseDataFile,
} from "../lib/data-file";
import { useDataset } from "../state/use-dataset";
import { useAuth } from "../state/use-auth";

export default function UploadPage() {
  const { setDataset } = useDataset();
  const { isGuest } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);

    try {
      const parsed = await parseDataFile(file);
      if (isGuest) {
        setDataset({
          columns: parsed.columns,
          rows: parsed.rows,
          fileName: file.name,
        });
      } else {
        const normalizedFile = createNormalizedCsvFile(parsed, file.name);
        const saved = await uploadDataset(normalizedFile, undefined, file.name);
        setDataset({
          datasetId: saved.id,
          columns: parsed.columns,
          rows: parsed.rows,
          fileName: saved.originalFileName,
        });
      }
      navigate("/dashboard");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The data file could not be imported."
      );
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !isUploading) void handleFile(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Upload Data
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isGuest
              ? "Analyse a data file in this browser. Guest data is never uploaded or saved."
              : "Import CSV, TSV, JSON, or XLSX data, then reopen it later from Datasets."}
          </p>
        </div>

        <button
          className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Importing…" : "Choose data file"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={DATA_FILE_ACCEPT}
        className="hidden"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.currentTarget.value = "";
        }}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          "rounded-2xl border bg-white p-6 shadow-sm transition dark:border-slate-800 dark:bg-slate-900",
          isDragging
            ? "ring-2 ring-blue-500"
            : "hover:border-slate-300 dark:hover:border-slate-700",
          isUploading ? "cursor-wait opacity-75" : "",
        ].join(" ")}
      >
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <div className="mx-auto mb-6 max-w-3xl rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <div className="font-medium text-slate-900 dark:text-slate-100">
              Supported formats
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-left text-slate-600 dark:text-slate-300">
              <li>CSV or TSV with a header row and unique column names</li>
              <li>JSON arrays of objects, including common data or records wrappers</li>
              <li>Excel .xlsx workbooks (the first worksheet is imported)</li>
              <li>Maximum file size: 10 MB</li>
              <li>UTF-8 recommended; quoted commas are supported</li>
            </ul>
            <div className="mt-3">
              Need a sample?{" "}
              <a
                className="font-medium text-slate-900 underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
                href="/sales_mock.csv"
                download
              >
                Download mock CSV
              </a>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Includes 12 months of sales and a few deliberate quality issues to explore.
              </div>
            </div>
          </div>

          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {isUploading
              ? isGuest ? "Analysing data locally…" : "Importing and saving data…"
              : "Drop a data file here"}
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isUploading ? "Please keep this page open" : "or click Choose data file"}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
