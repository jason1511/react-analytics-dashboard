import { describe, expect, it } from "vitest";
import { isDateLike, parseNumericValue, profileColumn, profileColumns } from "./profiling";

describe("numeric parsing", () => {
  it("supports common analytics number formats", () => {
    expect(parseNumericValue("$1,250.50")).toBe(1250.5);
    expect(parseNumericValue("(42.5)")).toBe(-42.5);
    expect(parseNumericValue("18%")).toBe(18);
    expect(parseNumericValue("INV-1001")).toBeUndefined();
  });
});

describe("date detection", () => {
  it("recognises ISO, Australian-style, and named dates without treating years as dates", () => {
    expect(isDateLike("2026-08-21")).toBe(true);
    expect(isDateLike("21/08/2026")).toBe(true);
    expect(isDateLike("21 August 2026")).toBe(true);
    expect(isDateLike("2026")).toBe(false);
    expect(isDateLike("2026-02-31")).toBe(false);
  });
});

describe("column profiling", () => {
  const rows = [
    {
      "Order ID": "1001",
      Date: "2026-08-18",
      Revenue: "$1,200",
      Region: "North",
      Active: "Yes",
      Notes: "Priority customer requested morning delivery",
      Empty: "",
    },
    {
      "Order ID": "1002",
      Date: "19/08/2026",
      Revenue: "950",
      Region: "South",
      Active: "No",
      Notes: "Standard delivery with no special instructions",
      Empty: "",
    },
    {
      "Order ID": "1003",
      Date: "20 August 2026",
      Revenue: "1 800",
      Region: "North",
      Active: "Yes",
      Notes: "Customer requested contact before arrival",
      Empty: "",
    },
    {
      "Order ID": "1004",
      Date: "2026/08/21",
      Revenue: "2,400",
      Region: "South",
      Active: "No",
      Notes: "Leave the package at the reception desk",
      Empty: "",
    },
  ];

  it("separates physical types from analytical roles", () => {
    const profiles = profileColumns(Object.keys(rows[0]), rows);
    const result = Object.fromEntries(
      profiles.map((profile) => [profile.column, [profile.type, profile.role]]),
    );

    expect(result).toEqual({
      "Order ID": ["number", "identifier"],
      Date: ["date", "temporal"],
      Revenue: ["number", "measure"],
      Region: ["category", "dimension"],
      Active: ["boolean", "dimension"],
      Notes: ["text", "description"],
      Empty: ["empty", "unknown"],
    });
  });

  it("reports confidence, completeness, distinct values, examples, and a reason", () => {
    const profile = profileColumn("Region", [...rows, { ...rows[0], Region: "" }]);

    expect(profile.confidence).toBeGreaterThanOrEqual(0.8);
    expect(profile.distinct).toBe(2);
    expect(profile.missing).toBe(1);
    expect(profile.completeness).toBe(0.8);
    expect(profile.sampleValues).toEqual(["North", "South"]);
    expect(profile.reason).toContain("repeating values");
  });

  it("samples across a large dataset instead of only reading its first rows", () => {
    const largeRows = Array.from({ length: 1_000 }, (_, index) => ({
      Value: index < 100 ? "not numeric" : String(index),
    }));

    expect(profileColumn("Value", largeRows).type).toBe("number");
  });
});
