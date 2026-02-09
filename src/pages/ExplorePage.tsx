import { useEffect, useMemo, useState } from "react";
import { useDataset } from "../state/use-dataset";

const MAX_PREVIEW_ROWS = 200;
const DEBOUNCE_MS = 200;
const MAX_VALUE_OPTIONS = 200;

type Filter = { column: string; value: string };

function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[‐-‒–—−]/g, "-")
    .replace(/\s+/g, " ");
}

function includesLoose(haystack: string, needle: string) {
  return normalize(haystack).includes(normalize(needle));
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function keyOf(f: Filter) {
  return `${f.column}::${f.value}`;
}

export default function ExplorePage() {
  const { columns, rows, fileName } = useDataset();

  // Search
  const [query, setQuery] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("__all__");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

  // Filters (applied)
  const [filters, setFilters] = useState<Filter[]>([]);

  // Filter builder (draft, not applied until Add)
  const [draftColumn, setDraftColumn] = useState<string>("");
  const [draftValue, setDraftValue] = useState<string>("");

  // init default draft column when data loads
  useEffect(() => {
    if (!draftColumn && columns.length) setDraftColumn(columns[0]);
  }, [columns, draftColumn]);

  // Unique values for the draft column (dropdown options)
  const draftValueOptions = useMemo(() => {
    if (!draftColumn) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r[draftColumn] ?? "").trim();
      if (v) set.add(v);
      if (set.size >= MAX_VALUE_OPTIONS) break;
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, draftColumn]);

  // when draft column changes, pick a sane default draft value
  useEffect(() => {
    if (!draftValueOptions.length) {
      setDraftValue("");
      return;
    }
    if (!draftValue || !draftValueOptions.includes(draftValue)) {
      setDraftValue(draftValueOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftColumn, draftValueOptions.join("|")]);

  const filteredRows = useMemo(() => {
    let out = rows;

    // 1) Apply filters (AND)
    if (filters.length) {
      out = out.filter((r) =>
        filters.every((f) => (r[f.column] ?? "") === f.value)
      );
    }

    // 2) Apply search
    const q = debouncedQuery.trim();
    if (!q) return out;

    if (searchColumn !== "__all__") {
      return out.filter((r) => includesLoose(r[searchColumn] ?? "", q));
    }

    return out.filter((r) => columns.some((c) => includesLoose(r[c] ?? "", q)));
  }, [rows, filters, debouncedQuery, searchColumn, columns]);

  if (!rows.length) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Explore Data</h2>
        <p className="text-sm text-slate-600">
          No dataset loaded yet. Upload a CSV first.
        </p>
      </div>
    );
  }

  const shown = Math.min(filteredRows.length, MAX_PREVIEW_ROWS);
  const isFiltering = query.trim() !== debouncedQuery.trim();

  const canAddFilter = Boolean(draftColumn && draftValue);
  const draftAlreadyActive = filters.some(
    (f) => f.column === draftColumn && f.value === draftValue
  );

  function addFilter() {
    if (!canAddFilter) return;
    const next: Filter = { column: draftColumn, value: draftValue };
    setFilters((prev) => (prev.some((f) => keyOf(f) === keyOf(next)) ? prev : [...prev, next]));
  }

  function removeFilter(toRemove: Filter) {
    setFilters((prev) => prev.filter((f) => keyOf(f) !== keyOf(toRemove)));
  }

  function clearAll() {
    setQuery("");
    setSearchColumn("__all__");
    setFilters([]); // important: no filters => show all rows
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Explore Data</h2>
          <p className="text-sm text-slate-600">
            {fileName ? `Loaded: ${fileName}. ` : ""}
            Showing {shown} of {filteredRows.length} matched rows (from {rows.length} total).
            {isFiltering ? " Filtering…" : ""}
          </p>
        </div>

        <button
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          onClick={clearAll}
          disabled={!query && filters.length === 0}
          title="Clear search and all active filters"
        >
          Clear all
        </button>
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        {/* Search row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-sm font-medium text-slate-800 sm:w-28">Search</div>

          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-56"
            value={searchColumn}
            onChange={(e) => setSearchColumn(e.target.value)}
          >
            <option value="__all__">All columns</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm sm:flex-1"
            placeholder='Try: "e bike", "E-Bike", "x1"...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setQuery("")}
            disabled={!query}
          >
            Clear
          </button>
        </div>

        {/* Filter builder row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-sm font-medium text-slate-800 sm:w-28">Add filter</div>

          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-56"
            value={draftColumn}
            onChange={(e) => setDraftColumn(e.target.value)}
          >
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm sm:flex-1"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            disabled={!draftValueOptions.length}
          >
            {!draftValueOptions.length ? (
              <option value="">No values</option>
            ) : (
              draftValueOptions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))
            )}
          </select>

          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={addFilter}
            disabled={!canAddFilter || draftAlreadyActive}
            title={draftAlreadyActive ? "This filter is already active" : "Add filter"}
          >
            {draftAlreadyActive ? "Added" : "Add"}
          </button>
        </div>

        {/* Active filters (chips) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-600">Active filters</div>

          {filters.length === 0 ? (
            <div className="text-sm text-slate-500">
              None (showing all rows)
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={keyOf(f)}
                  className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  onClick={() => removeFilter(f)}
                  title="Remove filter"
                >
                  <span className="font-medium">{f.column}</span>
                  <span className="text-slate-500">=</span>
                  <span>{f.value}</span>
                  <span className="ml-1 text-slate-500">✕</span>
                </button>
              ))}
            </div>
          )}

          {draftValueOptions.length >= MAX_VALUE_OPTIONS && (
            <p className="text-xs text-slate-500">
              Showing first {MAX_VALUE_OPTIONS} unique values for this column.
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border bg-white shadow">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-b px-3 py-2 text-left font-medium text-slate-700"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRows.slice(0, MAX_PREVIEW_ROWS).map((row, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-slate-50">
                {columns.map((col) => (
                  <td key={col} className="border-b px-3 py-2 text-slate-700">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length > MAX_PREVIEW_ROWS && (
        <p className="text-xs text-slate-500">
          Showing first {MAX_PREVIEW_ROWS} results. Pagination is coming next.
        </p>
      )}
    </div>
  );
}
