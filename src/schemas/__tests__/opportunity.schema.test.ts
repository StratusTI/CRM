import { describe, expect, it } from "vitest";
import {
  CreateOpportunitySchema,
  UpdateOpportunitySchema,
} from "@/src/schemas/opportunity.schema";

describe("CreateOpportunitySchema", () => {
  it("aceita apenas o nome (pipeline/etapa resolvidos no service)", () => {
    const result = CreateOpportunitySchema.safeParse({ name: "Deal" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipelineId).toBeUndefined();
      expect(result.data.stageId).toBeUndefined();
    }
  });

  it("aceita closeDate ISO, pipeline e etapa", () => {
    const result = CreateOpportunitySchema.safeParse({
      name: "Deal",
      closeDate: "2026-06-01T00:00:00.000Z",
      pipelineId: "pl_1",
      stageId: "st_1",
      amount: 1000,
    });
    expect(result.success).toBe(true);
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
    expect(UpdateOpportunitySchema.safeParse({ stageId: "st_2" }).success).toBe(
      true,
    );
  });

  it("rejeita payload vazio", () => {
    expect(UpdateOpportunitySchema.safeParse({}).success).toBe(false);
  });
});
