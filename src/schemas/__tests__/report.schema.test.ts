import { describe, expect, it } from "vitest";
import {
  CreateReportSchema,
  ReportQuerySchema,
  UpdateReportSchema,
} from "@/src/schemas/report.schema";

describe("CreateReportSchema", () => {
  it("aceita fonte + colunas e default de filtros", () => {
    const r = CreateReportSchema.safeParse({
      name: "Empresas",
      source: "companies",
      columns: ["name", "domain"],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.filters).toEqual([]);
  });

  it("rejeita fonte inválida e colunas vazias", () => {
    expect(
      CreateReportSchema.safeParse({
        name: "X",
        source: "invoices",
        columns: ["a"],
      }).success,
    ).toBe(false);
    expect(
      CreateReportSchema.safeParse({
        name: "X",
        source: "people",
        columns: [],
      }).success,
    ).toBe(false);
  });
});

describe("UpdateReportSchema", () => {
  it("aceita parcial e rejeita vazio", () => {
    expect(UpdateReportSchema.safeParse({ name: "Novo" }).success).toBe(true);
    expect(UpdateReportSchema.safeParse({}).success).toBe(false);
  });

  it("aceita uma query no patch", () => {
    const r = UpdateReportSchema.safeParse({
      query: {
        mode: "join",
        datasets: [{ alias: "opportunities", source: "opportunities" }],
        columns: ["opportunities.name"],
      },
    });
    expect(r.success).toBe(true);
  });
});

describe("ReportQuerySchema", () => {
  it("aceita JOIN com mesclagem e agregação", () => {
    const r = ReportQuerySchema.safeParse({
      mode: "join",
      datasets: [
        { alias: "opportunities", source: "opportunities" },
        { alias: "companies", source: "companies" },
      ],
      joins: [
        {
          leftAlias: "opportunities",
          rightAlias: "companies",
          leftField: "companyId",
          rightField: "id",
          type: "inner",
        },
      ],
      columns: ["opportunities.name", "companies.name"],
      group: {
        by: ["companies.name"],
        aggregations: [
          { fn: "sum", field: "opportunities.amount", alias: "Total" },
        ],
      },
    });
    expect(r.success).toBe(true);
  });

  it("aceita UNION com colunas mapeadas", () => {
    const r = ReportQuerySchema.safeParse({
      mode: "union",
      datasets: [
        { alias: "leads", source: "leads" },
        { alias: "people", source: "people" },
      ],
      columns: [
        {
          key: "nome",
          label: "Nome",
          fields: { leads: "name", people: "name" },
        },
      ],
      includeSource: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejeita UNION com um único dataset", () => {
    const r = ReportQuerySchema.safeParse({
      mode: "union",
      datasets: [{ alias: "leads", source: "leads" }],
      columns: [{ key: "n", label: "N", fields: { leads: "name" } }],
    });
    expect(r.success).toBe(false);
  });
});
