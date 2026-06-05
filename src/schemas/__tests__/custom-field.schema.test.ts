import { describe, expect, it } from "vitest";
import {
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
} from "@/src/schemas/custom-field.schema";

const base = { entity: "COMPANY", key: "segmento", label: "Segmento" };

describe("CreateCustomFieldSchema", () => {
  it("aceita campo de texto com defaults", () => {
    const r = CreateCustomFieldSchema.safeParse({ ...base, type: "TEXT" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.success && r.data.required).toBe(false);
      expect(r.data.options).toEqual([]);
    }
  });

  it("exige opções para SELECT", () => {
    expect(
      CreateCustomFieldSchema.safeParse({ ...base, type: "SELECT" }).success,
    ).toBe(false);
    expect(
      CreateCustomFieldSchema.safeParse({
        ...base,
        type: "SELECT",
        options: ["A", "B"],
      }).success,
    ).toBe(true);
  });

  it("rejeita chave inválida (maiúsculas/espaços)", () => {
    expect(
      CreateCustomFieldSchema.safeParse({
        ...base,
        key: "Meu Campo",
        type: "TEXT",
      }).success,
    ).toBe(false);
  });

  it("rejeita entidade inválida", () => {
    expect(
      CreateCustomFieldSchema.safeParse({
        ...base,
        entity: "INVOICE",
        type: "TEXT",
      }).success,
    ).toBe(false);
  });
});

describe("UpdateCustomFieldSchema", () => {
  it("aceita atualização parcial e rejeita vazio", () => {
    expect(UpdateCustomFieldSchema.safeParse({ label: "Novo" }).success).toBe(
      true,
    );
    expect(UpdateCustomFieldSchema.safeParse({}).success).toBe(false);
  });
});
