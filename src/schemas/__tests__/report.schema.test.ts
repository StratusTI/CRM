import { describe, expect, it } from "vitest";
import {
  CreateReportSchema,
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
});
