import { describe, expect, it } from "vitest";
import {
  CreatePipelineSchema,
  UpdatePipelineSchema,
} from "@/src/schemas/pipeline.schema";

describe("CreatePipelineSchema", () => {
  it("aceita nome e etapas válidas com defaults", () => {
    const result = CreatePipelineSchema.safeParse({
      name: "Vendas",
      stages: [{ name: "Novo" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stages[0].probability).toBe(0);
      expect(result.data.stages[0].category).toBe("OPEN");
    }
  });

  it("rejeita pipeline sem etapas", () => {
    expect(
      CreatePipelineSchema.safeParse({ name: "Vendas", stages: [] }).success,
    ).toBe(false);
  });

  it("rejeita probabilidade fora de 0–100", () => {
    expect(
      CreatePipelineSchema.safeParse({
        name: "Vendas",
        stages: [{ name: "X", probability: 150 }],
      }).success,
    ).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    expect(
      CreatePipelineSchema.safeParse({
        name: "Vendas",
        stages: [{ name: "X", category: "FOO" }],
      }).success,
    ).toBe(false);
  });

  it("aceita cor #RRGGBB e rejeita cor inválida", () => {
    expect(
      CreatePipelineSchema.safeParse({
        name: "V",
        stages: [{ name: "X", color: "#10b981" }],
      }).success,
    ).toBe(true);
    expect(
      CreatePipelineSchema.safeParse({
        name: "V",
        stages: [{ name: "X", color: "vermelho" }],
      }).success,
    ).toBe(false);
  });
});

describe("UpdatePipelineSchema", () => {
  it("aceita atualização parcial só do nome", () => {
    expect(UpdatePipelineSchema.safeParse({ name: "Novo nome" }).success).toBe(
      true,
    );
  });

  it("rejeita payload vazio", () => {
    expect(UpdatePipelineSchema.safeParse({}).success).toBe(false);
  });
});
