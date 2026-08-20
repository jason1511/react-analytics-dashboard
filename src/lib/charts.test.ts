import { describe, expect, it } from "vitest";
import { buildChartData, recommendCharts, type ChartConfig } from "./charts";
import { calculateDatasetStatistics } from "./statistics";

const rows = [
  { Date: "2026-01-01", Region: "North", Revenue: "10", Cost: "5" },
  { Date: "2026-01-02", Region: "South", Revenue: "20", Cost: "8" },
  { Date: "2026-01-03", Region: "North", Revenue: "30", Cost: "12" },
  { Date: "2026-02-01", Region: "South", Revenue: "40", Cost: "18" },
];

function config(overrides: Partial<ChartConfig>): ChartConfig {
  return {
    id: "test",
    title: "Test chart",
    type: "bar",
    xColumn: "Region",
    yColumn: "Revenue",
    aggregation: "sum",
    source: "custom",
    ...overrides,
  };
}

describe("chart data", () => {
  it("aggregates grouped bar data", () => {
    expect(buildChartData(config({}), rows)).toEqual([
      { label: "South", value: 60 },
      { label: "North", value: 40 },
    ]);
  });

  it("groups dates chronologically for line charts", () => {
    expect(
      buildChartData(
        config({ type: "line", xColumn: "Date", dateGranularity: "month" }),
        rows,
      ),
    ).toEqual([
      { label: "Jan 2026", value: 60 },
      { label: "Feb 2026", value: 40 },
    ]);
  });

  it("builds histograms and paired scatter points", () => {
    const histogram = buildChartData(
      config({ type: "histogram", xColumn: "Revenue", yColumn: undefined, aggregation: "count" }),
      rows,
    );
    expect(histogram.reduce((total, datum) => total + (datum.value ?? 0), 0)).toBe(4);

    expect(
      buildChartData(config({ type: "scatter", xColumn: "Revenue", yColumn: "Cost" }), rows),
    ).toEqual([
      { label: "10, 5", x: 10, y: 5 },
      { label: "20, 8", x: 20, y: 8 },
      { label: "30, 12", x: 30, y: 12 },
      { label: "40, 18", x: 40, y: 18 },
    ]);
  });
});

describe("chart recommendations", () => {
  it("recommends explainable charts without identifiers", () => {
    const columns = ["Date", "Region", "Revenue", "Cost"];
    const recommendations = recommendCharts(calculateDatasetStatistics(columns, rows), 10);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "line", xColumn: "Date", yColumn: "Revenue" }),
        expect.objectContaining({ type: "bar", xColumn: "Region", yColumn: "Revenue" }),
        expect.objectContaining({ type: "histogram", xColumn: "Revenue" }),
        expect.objectContaining({ type: "scatter", xColumn: "Revenue", yColumn: "Cost" }),
      ]),
    );
    expect(recommendations.every((recommendation) => recommendation.reason.length > 20)).toBe(true);
    expect(recommendations.every((recommendation) => recommendation.confidence > 0)).toBe(true);
  });
});
