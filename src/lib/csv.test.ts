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

  it("trims headers and rejects blank or duplicate column names", () => {
    expect(parseCsvText(" Region ,Revenue\nVIC,4200\n").columns).toEqual(["Region", "Revenue"]);
    expect(() => parseCsvText("Region, \nVIC,4200\n")).toThrow("Every column must have a header");
    expect(() => parseCsvText("Region,Region\nVIC,NSW\n")).toThrow();
  });
});
