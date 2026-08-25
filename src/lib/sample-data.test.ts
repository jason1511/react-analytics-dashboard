import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsvText } from "./csv";
import { recommendCharts } from "./charts";
import { analyseDataQuality } from "./quality";
import { calculateDatasetStatistics } from "./statistics";

const sampleCsv = readFileSync(
  new URL("../../public/sales_mock.csv", import.meta.url),
  "utf8",
);

describe("downloadable sales sample", () => {
  const parsed = parseCsvText(sampleCsv);
  const statistics = calculateDatasetStatistics(parsed.columns, parsed.rows);
  const quality = analyseDataQuality(parsed.columns, parsed.rows, statistics);

  it("is a substantial, consistently shaped dataset", () => {
    expect(parsed.rows).toHaveLength(96);
    expect(parsed.columns).toHaveLength(14);
    expect(parsed.rows.every((row) => parsed.columns.every((column) => column in row))).toBe(true);
  });

  it("demonstrates every supported profile type and key analytical role", () => {
    const profiles = Object.fromEntries(
      statistics.columns.map(({ profile }) => [profile.column, profile]),
    );

    expect(profiles["Order ID"]).toMatchObject({ role: "identifier" });
    expect(profiles["Order Date"]).toMatchObject({ type: "date", role: "temporal" });
    expect(profiles.Region).toMatchObject({ type: "category", role: "dimension" });
    expect(profiles.Units).toMatchObject({ type: "number", role: "measure" });
    expect(profiles.Returned).toMatchObject({ type: "boolean", role: "dimension" });
    expect(profiles["Customer Note"]).toMatchObject({ type: "text", role: "description" });
  });

  it("contains deliberate examples for the data-quality workspace", () => {
    expect(quality.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "duplicate" }),
        expect.objectContaining({ category: "invalid", column: "Order Date" }),
        expect.objectContaining({ category: "invalid", column: "Units" }),
        expect.objectContaining({ category: "formatting", column: "Region" }),
        expect.objectContaining({ category: "constant", column: "Currency" }),
        expect.objectContaining({ category: "outlier" }),
      ]),
    );
  });

  it("supports every chart family through recommendations or the chart builder", () => {
    const chartTypes = new Set(recommendCharts(statistics, 20).map(({ type }) => type));
    expect([...chartTypes]).toEqual(
      expect.arrayContaining(["line", "bar", "donut", "histogram", "scatter"]),
    );
  });
});
