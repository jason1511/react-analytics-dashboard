import { describe, expect, it } from "vitest";
import {
  columnStats,
  detectNumericColumns,
  formatNumber,
  getCategoryCounts,
  pickDefaultGroupBy,
  sumByGroup,
  type DataRow,
} from "./analytics";

const salesRows: DataRow[] = [
  { Region: "North", Revenue: "$1,200", Units: "4", Note: "Paid" },
  { Region: "South", Revenue: "950", Units: "3", Note: "" },
  { Region: "North", Revenue: "1 800", Units: "5", Note: "Paid" },
  { Region: "", Revenue: "invalid", Units: "", Note: "Pending" },
];

describe("getCategoryCounts", () => {
  it("groups rows, substitutes blank labels, and sorts by count", () => {
    expect(getCategoryCounts(salesRows, "Region")).toEqual([
      { label: "North", value: 2 },
      { label: "South", value: 1 },
      { label: "—", value: 1 },
    ]);
  });

  it("respects the requested result limit", () => {
    expect(getCategoryCounts(salesRows, "Region", 1)).toEqual([
      { label: "North", value: 2 },
    ]);
  });
});

describe("detectNumericColumns", () => {
  it("recognises formatted numeric values and rejects mixed text columns", () => {
    expect(
      detectNumericColumns(["Region", "Revenue", "Units", "Note"], salesRows)
    ).toEqual(["Units"]);
  });

  it("uses the configured sample size", () => {
    const rows = [{ Value: "10" }, { Value: "not numeric" }];
    expect(detectNumericColumns(["Value"], rows, 1)).toEqual(["Value"]);
  });

  it("does not expose numeric identifiers as aggregatable measures", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      "Order ID": String(1000 + index),
      Revenue: String(100 + index),
    }));

    expect(detectNumericColumns(["Order ID", "Revenue"], rows)).toEqual(["Revenue"]);
  });
});

describe("sumByGroup", () => {
  it("sums currency-formatted values and treats invalid values as zero", () => {
    expect(sumByGroup(salesRows, "Region", "Revenue")).toEqual([
      { label: "North", value: 3000 },
      { label: "South", value: 950 },
      { label: "—", value: 0 },
    ]);
  });
});

describe("pickDefaultGroupBy", () => {
  it("prefers a useful category over IDs, dates, and unique measures", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      "Order ID": `ORD-${index + 1}`,
      Date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      Region: ["North", "South", "East", "West", "Central"][index % 5],
      Revenue: String(100 + index),
    }));

    expect(
      pickDefaultGroupBy(["Order ID", "Date", "Region", "Revenue"], rows)
    ).toBe("Region");
  });
});

describe("columnStats", () => {
  it("reports type, distinct values, missing values, and completeness", () => {
    expect(columnStats(["Region", "Units", "Note"], salesRows)).toEqual([
      {
        col: "Region",
        kind: "categorical",
        distinct: 2,
        missing: 1,
        completeness: 0.75,
      },
      {
        col: "Units",
        kind: "numeric",
        distinct: 3,
        missing: 1,
        completeness: 0.75,
      },
      {
        col: "Note",
        kind: "categorical",
        distinct: 2,
        missing: 1,
        completeness: 0.75,
      },
    ]);
  });
});

describe("formatNumber", () => {
  it("formats thousands and millions compactly", () => {
    expect(formatNumber(1500)).toBe("1.5k");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});
