import { describe, expect, it } from "vitest";
import { analyseDataQuality } from "./quality";
import { calculateDatasetStatistics } from "./statistics";

const columns = ["Order ID", "Date", "Amount", "Region", "Status", "Note"];
const rows = [
  { "Order ID": "A", Date: "2026-01-01", Amount: "10", Region: "North", Status: "Active", Note: "OK" },
  { "Order ID": "B", Date: "2026-01-02", Amount: "11", Region: "north", Status: "Active", Note: "" },
  { "Order ID": "C", Date: "2026-01-03", Amount: "12", Region: "South", Status: "Active", Note: "OK" },
  { "Order ID": "C", Date: "2026-01-04", Amount: "13", Region: "South", Status: "Active", Note: "OK" },
  { "Order ID": "E", Date: "2026-01-05", Amount: "14", Region: "East", Status: "Active", Note: "OK" },
  { "Order ID": "F", Date: "not-a-date", Amount: "1000", Region: "West", Status: "Active", Note: "OK" },
  { "Order ID": "A", Date: "2026-01-01", Amount: "10", Region: "North", Status: "Active", Note: "OK" },
];

describe("data quality analysis", () => {
  const statistics = calculateDatasetStatistics(columns, rows);
  const report = analyseDataQuality(columns, rows, statistics);

  it("finds dataset and identifier duplicates", () => {
    const rowDuplicate = report.issues.find(
      (issue) => issue.category === "duplicate" && !issue.column,
    );
    expect(rowDuplicate).toMatchObject({ affectedCount: 1 });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          category: "duplicate",
          column: "Order ID",
          affectedCount: 4,
        }),
      ]),
    );
  });

  it("finds missing, invalid, constant, formatting, and outlier issues", () => {
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "missing", column: "Note", affectedCount: 1 }),
        expect.objectContaining({ category: "invalid", column: "Date", affectedCount: 1 }),
        expect.objectContaining({ category: "constant", column: "Status" }),
        expect.objectContaining({ category: "formatting", column: "Region" }),
        expect.objectContaining({ category: "outlier", column: "Amount", affectedCount: 1 }),
      ]),
    );
  });

  it("returns ordered severity totals and a bounded score", () => {
    expect(report.counts.error).toBeGreaterThan(0);
    expect(report.counts.warning).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.issues[0].severity).toBe("error");
  });

  it("returns a perfect report for clean data", () => {
    const cleanRows = [
      { Region: "North", Revenue: "10" },
      { Region: "South", Revenue: "20" },
      { Region: "East", Revenue: "30" },
    ];
    const cleanColumns = ["Region", "Revenue"];
    const clean = analyseDataQuality(
      cleanColumns,
      cleanRows,
      calculateDatasetStatistics(cleanColumns, cleanRows),
    );

    expect(clean).toEqual({
      score: 100,
      issues: [],
      counts: { error: 0, warning: 0, info: 0 },
    });
  });
});
