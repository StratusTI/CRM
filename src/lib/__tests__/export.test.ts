import { describe, expect, it } from "vitest";
import { toCsv, toSpreadsheetML } from "@/src/lib/export";

const columns = ["name", "amount", "tags"];
const rows = [
  { name: "Acme, Inc", amount: 100, tags: ["a", "b"] },
  { name: 'Aspas "x"', amount: 0, tags: [] },
];

describe("toCsv", () => {
  it("escapa vírgulas/aspas e junta arrays", () => {
    const csv = toCsv(columns, rows);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("name,amount,tags");
    expect(lines[1]).toBe('"Acme, Inc",100,"a, b"');
    expect(lines[2]).toBe('"Aspas ""x""",0,');
  });

  it("inclui BOM UTF-8", () => {
    expect(toCsv(["a"], []).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("toSpreadsheetML", () => {
  it("gera XML com tipos Number/String e escapa entidades", () => {
    const xml = toSpreadsheetML(columns, rows);
    expect(xml).toContain('mso-application progid="Excel.Sheet"');
    expect(xml).toContain('ss:Type="Number">100');
    expect(xml).toContain("Acme, Inc");
    expect(xml).toContain("Aspas &quot;x&quot;");
  });
});
