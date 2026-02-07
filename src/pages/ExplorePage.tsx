import { useEffect, useMemo, useState } from "react";
import { useDataset } from "../state/use-dataset";

const MAX_PREVIEW_ROWS = 200;
const DEBOUNCE_MS = 200;
const MAX_VALUE_OPTIONS = 200; // prevent huge dropdowns

type Filter = { column: string; value: string };

function includesInsensitive(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
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

  // Filters (chips)
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");

  // init default filter column once columns appear
  useEffect(() => {
    if (!filterColumn && columns.length) setFilterColumn(columns[0]);
  }, [columns, filterColumn]);

  const valueOptions = useMemo(() => {
    if (!filterColumn) return [];

    // Collect unique values for the selected column
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r[filterColumn] ?? "").trim();
      if (v) set.add(v);
      if (set.size >= MAX_VALUE_OPTIONS) break;
    }

    // Sort alphabetically for nicer UX
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, filterColumn]);

  // Make sure filterValue is valid when column changes
  useEffect(() => {
    if (!valueOptions.length) {
      setFilterValue("");
      return;
    }
    // keep existing if present, else pick first
    if (!valueOptions.includes(filterValue)) setFilterValue(valueOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterColumn, valueOptions.join("|")]);

  const filteredRows = useMemo(() => {
    // 1) Apply chips (AND)
    let out = rows;
    if (filters.length) {
      out = out.filter((r) =>
        filters.every((f) => (r[f.column] ?? "") === f.value)
      );
    }

    // 2) Apply search
    const q = debouncedQuery.trim();
    if (!q) return out;

    if (searchColumn !== "__all__") {
      return out.filter((r) => includesInsensitive(r[searchColumn] ?? "", q));
    }

    return out.filter((r) =>
      columns.some((c) => includesInsensitive(r[c] ?? "", q))
    );
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

  function addFilter() {
    if (!filterColumn || !filterValue) return;

    const next: Filter = { column: filterColumn, value: filterValue };
    setFilters((prev) => {
      const exists = prev.some((f) => keyOf(f) === keyOf(next));
      return exists ? prev : [...prev, next];
    });
  }

  function removeFilter(toRemove: Filter) {
    setFilters((prev) => prev.filter((f) => keyOf(f) !== keyOf(toRemove)));
  }

  function clearAll() {
    setQuery("");
    setSearchColumn("__all__");
    setFilters([]);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Explore Data</h2>
          <p className="text-sm text-slate-600">
            {fileName ? `Loaded: ${fileName}. ` : ""}
            Showing {shown} of {filteredRows.length} matched rows (from{" "}
            {rows.length} total).
            {isFiltering ? " Filtering…" : ""}
          </p>
        </div>

        <button
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          onClick={clearAll}
          disabled={!query && filters.length === 0}
          title="Clear search and filters"
        >
          Clear all
        </button>
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        {/* Search row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-sm font-medium text-slate-800 sm:w-28">
            Search
          </div>

          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-56"
            value={searchColumn}
            onChange={(e) => setSearchColumn(e.target.value)}
          >
            <option value="__all__">All columns</option>
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm sm:flex-1"
            placeholder="Type to search…"
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

        {/* Filter row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-sm font-medium text-slate-800 sm:w-28">
            Filter
          </div>

          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm sm:w-56"
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value)}
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm sm:flex-1"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            disabled={!valueOptions.length}
          >
            {!valueOptions.length ? (
              <option value="">No values</option>
            ) : (
              valueOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))
            )}
          </select>

          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={addFilter}
            disabled={!filterColumn || !filterValue}
          >
            Add filter
          </button>
        </div>

        {/* Chips */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
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

        {valueOptions.length >= MAX_VALUE_OPTIONS && (
          <p className="text-xs text-slate-500">
            Showing first {MAX_VALUE_OPTIONS} unique values for this column.
          </p>
        )}
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
