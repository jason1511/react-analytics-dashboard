import type { DataRow } from "./analytics";
import { parseDateValue } from "./profiling";

export type DashboardFilters = {
  dateColumn?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryColumn?: string;
  categoryValue?: string;
};

function dateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) return undefined;
  return endOfDay ? timestamp + 86_399_999 : timestamp;
}

export function filterDashboardRows(rows: DataRow[], filters: DashboardFilters) {
  const from = dateBoundary(filters.dateFrom);
  const to = dateBoundary(filters.dateTo, true);
  const hasDateFilter = Boolean(filters.dateColumn && (from !== undefined || to !== undefined));
  const categoryValue = filters.categoryValue?.trim();

  return rows.filter((row) => {
    if (hasDateFilter && filters.dateColumn) {
      const timestamp = parseDateValue(row[filters.dateColumn] ?? "");
      if (timestamp === undefined) return false;
      if (from !== undefined && timestamp < from) return false;
      if (to !== undefined && timestamp > to) return false;
    }

    if (
      filters.categoryColumn &&
      categoryValue &&
      (row[filters.categoryColumn] ?? "").trim() !== categoryValue
    ) {
      return false;
    }

    return true;
  });
}
