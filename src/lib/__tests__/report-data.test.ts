import { describe, expect, it } from "vitest";
import { processReport } from "@/src/lib/report-data";

const rows = [
  { name: "Acme", source: "WhatsApp", amount: 100 },
  { name: "Beta", source: "Site", amount: 50 },
  { name: "Gama", source: "WhatsApp", amount: 200 },
];

describe("processReport", () => {
  it("projeta colunas e aplica filtros", () => {
    const out = processReport(rows, {
      columns: ["name", "amount"],
      filters: [{ field: "source", operator: "equals", value: "WhatsApp" }],
    });
    expect(out.grouped).toBe(false);
    expect(out.total).toBe(2);
    expect(out.rows).toEqual([
      { name: "Acme", amount: 100 },
      { name: "Gama", amount: 200 },
    ]);
  });

  it("ordena numericamente quando possível", () => {
    const out = processReport(rows, {
      columns: ["name", "amount"],
      filters: [],
      sort: { field: "amount", direction: "desc" },
    });
    expect(out.rows.map((r) => r.amount)).toEqual([200, 100, 50]);
  });

  it("agrupa por campo contando ocorrências", () => {
    const out = processReport(rows, {
      columns: ["name"],
      filters: [],
      groupBy: "source",
    });
    expect(out.grouped).toBe(true);
    expect(out.columns).toEqual(["source", "count"]);
    const wpp = out.rows.find((r) => r.source === "WhatsApp");
    expect(wpp?.count).toBe(2);
  });
});
