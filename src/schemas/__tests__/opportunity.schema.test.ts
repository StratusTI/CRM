import { describe, expect, it } from "vitest";
import {
  CreateOpportunitySchema,
  UpdateOpportunitySchema,
} from "@/src/schemas/opportunity.schema";

describe("CreateOpportunitySchema", () => {
  it("aceita apenas o nome e usa stage NEW por padrão", () => {
    const result = CreateOpportunitySchema.safeParse({ name: "Deal" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stage).toBe("NEW");
  });

  it("aceita closeDate ISO e stage válido", () => {
    const result = CreateOpportunitySchema.safeParse({
      name: "Deal",
      closeDate: "2026-06-01T00:00:00.000Z",
      stage: "PROPOSAL",
      amount: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita stage inválido", () => {
    expect(
      CreateOpportunitySchema.safeParse({ name: "Deal", stage: "FOO" }).success,
    ).toBe(false);
  });

  it("rejeita closeDate não-ISO", () => {
    expect(
      CreateOpportunitySchema.safeParse({ name: "Deal", closeDate: "amanhã" })
        .success,
    ).toBe(false);
  });

  it("rejeita amount negativo", () => {
    expect(
      CreateOpportunitySchema.safeParse({ name: "Deal", amount: -5 }).success,
    ).toBe(false);
  });
});

describe("UpdateOpportunitySchema", () => {
  it("aceita atualização parcial", () => {
    expect(UpdateOpportunitySchema.safeParse({ stage: "WON" }).success).toBe(
      true,
    );
  });

  it("rejeita payload vazio", () => {
    expect(UpdateOpportunitySchema.safeParse({}).success).toBe(false);
  });
});
