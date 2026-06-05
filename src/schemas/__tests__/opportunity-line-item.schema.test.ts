import { describe, expect, it } from "vitest";
import {
  CreateLineItemSchema,
  UpdateLineItemSchema,
} from "@/src/schemas/opportunity-line-item.schema";

describe("CreateLineItemSchema", () => {
  it("aplica defaults (quantidade 1, desconto 0)", () => {
    const result = CreateLineItemSchema.safeParse({ productId: "pr_1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
      expect(result.data.discountPct).toBe(0);
    }
  });

  it("rejeita quantidade < 1", () => {
    expect(
      CreateLineItemSchema.safeParse({ name: "X", quantity: 0 }).success,
    ).toBe(false);
  });

  it("rejeita desconto fora de 0–100", () => {
    expect(
      CreateLineItemSchema.safeParse({ name: "X", discountPct: 120 }).success,
    ).toBe(false);
  });
});

describe("UpdateLineItemSchema", () => {
  it("aceita atualização parcial e rejeita vazio", () => {
    expect(UpdateLineItemSchema.safeParse({ quantity: 3 }).success).toBe(true);
    expect(UpdateLineItemSchema.safeParse({}).success).toBe(false);
  });
});
