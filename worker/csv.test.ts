import { describe, expect, it } from "vitest";
import { inspectCsv } from "./csv";

describe("Worker CSV inspection", () => {
  it("counts rows and columns", () => {
    expect(inspectCsv("Region,Revenue\nNorth,1200\nSouth,950\n")).toEqual({
      rowCount: 2,
      columnCount: 2,
    });
  });

  it("rejects duplicate headers", () => {
    expect(() => inspectCsv("Region,Region\nNorth,South\n")).toThrow(
      "CSV column headers must be unique.",
    );
  });
});
