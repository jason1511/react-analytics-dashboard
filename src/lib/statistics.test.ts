import { describe, expect, it } from "vitest";
import { calculateDatasetStatistics } from "./statistics";

const columns = ["Order ID", "Date", "Amount", "Region", "Note"];
const rows = [
  { "Order ID": "1001", Date: "2026-08-18", Amount: "10", Region: "North", Note: "Alpha" },
  { "Order ID": "1002", Date: "19/08/2026", Amount: "20", Region: "South", Note: "Beta" },
  { "Order ID": "1003", Date: "20 August 2026", Amount: "30", Region: "North", Note: "" },
  { "Order ID": "1003", Date: "20 August 2026", Amount: "30", Region: "North", Note: "" },
];

describe("dataset statistics", () => {
  it("summarises the complete dataset", () => {
    const statistics = calculateDatasetStatistics(columns, rows);

    expect(statistics).toMatchObject({
      rowCount: 4,
      columnCount: 5,
      totalCells: 20,
      populatedCells: 18,
      missingCells: 2,
      completeness: 0.9,
      duplicateRows: 1,
      typeCounts: {
        number: 2,
        date: 1,
        boolean: 0,
        category: 1,
        text: 1,
        empty: 0,
      },
      roleCounts: {
        measure: 1,
        dimension: 1,
        temporal: 1,
        identifier: 1,
        description: 1,
        unknown: 0,
      },
    });
    expect(statistics.dateCoverage).toEqual({
      earliest: "2026-08-18T00:00:00.000Z",
      latest: "2026-08-20T00:00:00.000Z",
    });
  });

  it("calculates numeric distribution statistics", () => {
    const amount = calculateDatasetStatistics(columns, rows).columns.find(
      (column) => column.profile.column === "Amount",
    );

    expect(amount?.numeric).toMatchObject({
      count: 4,
      minimum: 10,
      maximum: 30,
      sum: 90,
      mean: 22.5,
      median: 25,
      firstQuartile: 17.5,
      thirdQuartile: 30,
      zeroCount: 0,
      negativeCount: 0,
    });
    expect(amount?.numeric?.standardDeviation).toBeCloseTo(8.29156, 4);
  });

  it("calculates frequencies, text lengths, date ranges, and identifier uniqueness", () => {
    const statistics = calculateDatasetStatistics(columns, rows);
    const byName = Object.fromEntries(
      statistics.columns.map((column) => [column.profile.column, column]),
    );

    expect(byName.Region.frequencies?.[0]).toEqual({
      value: "North",
      count: 3,
      percentage: 0.75,
    });
    expect(byName.Note.text).toEqual({
      minimumLength: 4,
      maximumLength: 5,
      averageLength: 4.5,
    });
    expect(byName.Date.date).toEqual({
      validCount: 4,
      earliest: "2026-08-18T00:00:00.000Z",
      latest: "2026-08-20T00:00:00.000Z",
    });
    expect(byName["Order ID"].identifier).toEqual({
      uniquePercentage: 0.75,
      duplicateValues: 1,
    });
  });

  it("handles an empty dataset without invalid arithmetic", () => {
    expect(calculateDatasetStatistics([], [])).toMatchObject({
      rowCount: 0,
      columnCount: 0,
      totalCells: 0,
      populatedCells: 0,
      missingCells: 0,
      completeness: 0,
      duplicateRows: 0,
      columns: [],
    });
  });
});
