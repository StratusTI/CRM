import { describe, expect, it } from "vitest";
import {
  CreateQuotaSchema,
  UpdateQuotaSchema,
} from "@/src/schemas/quota.schema";

const base = { ownerId: "u_1", targetAmount: 10000 };

describe("CreateQuotaSchema", () => {
  it("aceita mês válido AAAA-MM", () => {
    const r = CreateQuotaSchema.safeParse({
      ...base,
      period: "MONTH",
      periodKey: "2026-06",
    });
    expect(r.success).toBe(true);
  });

  it("aceita trimestre válido AAAA-Qn", () => {
    const r = CreateQuotaSchema.safeParse({
      ...base,
      period: "QUARTER",
      periodKey: "2026-Q2",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita periodKey de mês com period QUARTER", () => {
    const r = CreateQuotaSchema.safeParse({
      ...base,
      period: "QUARTER",
      periodKey: "2026-06",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita mês inexistente (13)", () => {
    const r = CreateQuotaSchema.safeParse({
      ...base,
      period: "MONTH",
      periodKey: "2026-13",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita meta negativa", () => {
    const r = CreateQuotaSchema.safeParse({
      ownerId: "u_1",
      period: "MONTH",
      periodKey: "2026-06",
      targetAmount: -5,
    });
    expect(r.success).toBe(false);
  });
});

describe("UpdateQuotaSchema", () => {
  it("exige targetAmount", () => {
    expect(UpdateQuotaSchema.safeParse({ targetAmount: 500 }).success).toBe(
      true,
    );
    expect(UpdateQuotaSchema.safeParse({}).success).toBe(false);
  });
});
