import { describe, expect, it } from "vitest";
import { parseCsvText } from "./csv";

describe("parseCsvText", () => {
  it("parses headers, quoted values, and rows", () => {
    const result = parseCsvText(
      'Region,Product,Revenue\nNorth,"Bike, City",1200\nSouth,Bike B,950\n'
    );

    expect(result.columns).toEqual(["Region", "Product", "Revenue"]);
    expect(result.rows).toEqual([
      { Region: "North", Product: "Bike, City", Revenue: "1200" },
      { Region: "South", Product: "Bike B", Revenue: "950" },
    ]);
  });

  it("rejects data without a header", () => {
    expect(() => parseCsvText("")).toThrow("No columns detected");
  });
});
