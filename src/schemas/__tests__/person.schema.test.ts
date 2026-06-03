import { describe, expect, it } from "vitest";
import {
  CreatePersonSchema,
  UpdatePersonSchema,
} from "@/src/schemas/person.schema";

describe("CreatePersonSchema", () => {
  it("aceita apenas o nome (emails/phones default [])", () => {
    const result = CreatePersonSchema.safeParse({ name: "Ada" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emails).toEqual([]);
      expect(result.data.phones).toEqual([]);
    }
  });

  it("rejeita nome vazio", () => {
    expect(CreatePersonSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(
      CreatePersonSchema.safeParse({ name: "Ada", emails: ["nope"] }).success,
    ).toBe(false);
  });

  it("aceita linkedin sem protocolo e normaliza", () => {
    const result = CreatePersonSchema.safeParse({
      name: "Ada",
      linkedin: "https://www.linkedin.com/in/ada",
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.linkedin).toBe("https://linkedin.com/in/ada");
  });

  it("rejeita linkedin que não é URL", () => {
    expect(
      CreatePersonSchema.safeParse({ name: "Ada", linkedin: "x" }).success,
    ).toBe(false);
  });

  it("normaliza telefones para o padrão +55 (DD) 99999-9999", () => {
    const result = CreatePersonSchema.safeParse({
      name: "Ada",
      phones: [
        "11999998888",
        "(11) 99999-8888",
        "+55 11 99999 8888",
        "5511999998888",
        "011999998888",
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phones).toEqual([
        "+55 (11) 99999-8888",
        "+55 (11) 99999-8888",
        "+55 (11) 99999-8888",
        "+55 (11) 99999-8888",
        "+55 (11) 99999-8888",
      ]);
    }
  });

  it("normaliza telefone fixo (8 dígitos) mantendo o padrão", () => {
    const result = CreatePersonSchema.safeParse({
      name: "Ada",
      phones: ["1133334444"],
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.phones).toEqual(["+55 (11) 3333-4444"]);
  });

  it("mantém o valor original quando não reconhece o formato", () => {
    const result = CreatePersonSchema.safeParse({
      name: "Ada",
      phones: ["12345"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phones).toEqual(["12345"]);
  });
});

describe("UpdatePersonSchema", () => {
  it("permite limpar companyId com null", () => {
    expect(UpdatePersonSchema.safeParse({ companyId: null }).success).toBe(
      true,
    );
  });

  it("rejeita payload vazio", () => {
    expect(UpdatePersonSchema.safeParse({}).success).toBe(false);
  });
});
