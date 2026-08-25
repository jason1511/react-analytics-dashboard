import { describe, expect, it, vi } from "vitest";
import {
  createNormalizedCsvFile,
  detectDataFileFormat,
  parseDataFile,
  parseJsonText,
} from "./data-file";
import { parseCsvText } from "./csv";

vi.mock("read-excel-file/browser", () => ({
  readSheet: vi.fn(async () => [
    ["Date", "Region", "Revenue", "Returned"],
    [new Date("2025-01-02T00:00:00.000Z"), "VIC", 4200, false],
    [new Date("2025-01-03T00:00:00.000Z"), "NSW", 2100, true],
  ]),
}));

describe("data file import", () => {
  it("recognises supported extensions without relying on MIME types", () => {
    expect(detectDataFileFormat({ name: "sales.CSV", type: "" })).toBe("csv");
    expect(detectDataFileFormat({ name: "sales.tsv", type: "" })).toBe("tsv");
    expect(detectDataFileFormat({ name: "sales.json", type: "" })).toBe("json");
    expect(detectDataFileFormat({ name: "sales.xlsx", type: "" })).toBe("xlsx");
    expect(() => detectDataFileFormat({ name: "sales.pdf", type: "application/pdf" })).toThrow(
      "Unsupported file type",
    );
  });

  it("imports tab-separated values", async () => {
    const parsed = await parseDataFile(new File([
      "Region\tProduct\tRevenue\nVIC\tE-Bike X1\t4200\nNSW\tCity Bike C1\t800\n",
    ], "sales.tsv", { type: "text/tab-separated-values" }));

    expect(parsed.format).toBe("tsv");
    expect(parsed.columns).toEqual(["Region", "Product", "Revenue"]);
    expect(parsed.rows[1]).toEqual({ Region: "NSW", Product: "City Bike C1", Revenue: "800" });
  });

  it("imports JSON arrays and common record wrappers", () => {
    const direct = parseJsonText(JSON.stringify([
      { region: "VIC", revenue: 4200, returned: false, metadata: { channel: "Online" } },
      { region: "NSW", revenue: 2100, returned: true },
    ]));
    const wrapped = parseJsonText('{"records":[{"region":"QLD","revenue":900}]}');

    expect(direct.columns).toEqual(["region", "revenue", "returned", "metadata"]);
    expect(direct.rows[0].metadata).toBe('{"channel":"Online"}');
    expect(direct.rows[1].metadata).toBe("");
    expect(wrapped.rows).toEqual([{ region: "QLD", revenue: "900" }]);
  });

  it("imports the first XLSX worksheet and preserves typed cell values", async () => {
    const parsed = await parseDataFile(new File(["xlsx fixture"], "sales.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }));

    expect(parsed.format).toBe("xlsx");
    expect(parsed.rows[0]).toEqual({
      Date: "2025-01-02T00:00:00.000Z",
      Region: "VIC",
      Revenue: "4200",
      Returned: "false",
    });
  });

  it("creates a validated CSV representation for persistent storage", async () => {
    const normalized = createNormalizedCsvFile({
      columns: ["Region", "Note"],
      rows: [{ Region: "VIC", Note: "Called, then purchased" }],
    }, "sales.json");

    expect(normalized.name).toBe("sales.csv");
    expect(normalized.type).toBe("text/csv;charset=utf-8");
    expect(parseCsvText(await normalized.text()).rows).toEqual([
      { Region: "VIC", Note: "Called, then purchased" },
    ]);
  });
});
