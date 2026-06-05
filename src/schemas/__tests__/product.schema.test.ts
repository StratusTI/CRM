import { describe, expect, it } from "vitest";
import {
  CreateProductSchema,
  UpdateProductSchema,
} from "@/src/schemas/product.schema";

describe("CreateProductSchema", () => {
  it("aplica defaults (preço 0, BRL, ONE_TIME, ativo)", () => {
    const result = CreateProductSchema.safeParse({ name: "Plano" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitPrice).toBe(0);
      expect(result.data.currency).toBe("BRL");
      expect(result.data.billingType).toBe("ONE_TIME");
      expect(result.data.active).toBe(true);
    }
  });

  it("normaliza a moeda para maiúsculas", () => {
    const result = CreateProductSchema.safeParse({
      name: "Plano",
      currency: "usd",
    });
    expect(result.success && result.data.currency).toBe("USD");
  });

  it("rejeita billingType inválido", () => {
    expect(
      CreateProductSchema.safeParse({ name: "X", billingType: "WEEKLY" })
        .success,
    ).toBe(false);
  });

  it("rejeita preço negativo", () => {
    expect(
      CreateProductSchema.safeParse({ name: "X", unitPrice: -1 }).success,
    ).toBe(false);
  });
});

describe("UpdateProductSchema", () => {
  it("aceita atualização parcial", () => {
    expect(UpdateProductSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("rejeita payload vazio", () => {
    expect(UpdateProductSchema.safeParse({}).success).toBe(false);
  });
});
