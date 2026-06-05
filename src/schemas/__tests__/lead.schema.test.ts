import { describe, expect, it } from "vitest";
import {
  CreateLeadSchema,
  CreateScoringRuleSchema,
  UpdateLeadSchema,
} from "@/src/schemas/lead.schema";

describe("CreateLeadSchema", () => {
  it("aceita só o nome e usa status NEW por padrão", () => {
    const r = CreateLeadSchema.safeParse({ name: "Maria" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("NEW");
      expect(r.data.emails).toEqual([]);
    }
  });

  it("rejeita e-mail inválido", () => {
    expect(
      CreateLeadSchema.safeParse({ name: "X", emails: ["nao-email"] }).success,
    ).toBe(false);
  });
});

describe("UpdateLeadSchema", () => {
  it("aceita parcial e rejeita vazio", () => {
    expect(UpdateLeadSchema.safeParse({ status: "WORKING" }).success).toBe(
      true,
    );
    expect(UpdateLeadSchema.safeParse({}).success).toBe(false);
  });
});

describe("CreateScoringRuleSchema", () => {
  it("aceita regra com pontos e rejeita campo inválido", () => {
    expect(
      CreateScoringRuleSchema.safeParse({
        field: "source",
        operator: "equals",
        value: "WhatsApp",
        points: 10,
      }).success,
    ).toBe(true);
    expect(
      CreateScoringRuleSchema.safeParse({
        field: "invalid",
        operator: "equals",
        points: 10,
      }).success,
    ).toBe(false);
  });
});
