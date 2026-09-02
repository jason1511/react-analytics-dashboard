import { describe, expect, it } from "vitest";
import { filterDashboardRows } from "./dashboard";

const rows = [
  { date: "2026-01-01", region: "North", revenue: "10" },
  { date: "2026-01-15", region: "South", revenue: "20" },
  { date: "2026-02-01", region: "North", revenue: "30" },
  { date: "not-a-date", region: "North", revenue: "40" },
];

describe("filterDashboardRows", () => {
  it("returns every row when no filters are active", () => {
    expect(filterDashboardRows(rows, {})).toEqual(rows);
  });

  it("combines inclusive date and category filters", () => {
    expect(
      filterDashboardRows(rows, {
        dateColumn: "date",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        categoryColumn: "region",
        categoryValue: "North",
      }),
    ).toEqual([rows[0]]);
  });

  it("excludes invalid dates only when a date boundary is active", () => {
    expect(filterDashboardRows(rows, { dateColumn: "date" })).toHaveLength(4);
    expect(
      filterDashboardRows(rows, { dateColumn: "date", dateFrom: "2026-01-01" }),
    ).toHaveLength(3);
  });
});
