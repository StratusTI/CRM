import { describe, expect, it } from "vitest";
import {
  CreateDocumentTemplateSchema,
  ListDocumentTemplatesQuerySchema,
} from "@/src/schemas/document-template.schema";

describe("CreateDocumentTemplateSchema", () => {
  it("aceita título, content opcional e tipo válido", () => {
    const parsed = CreateDocumentTemplateSchema.safeParse({
      title: "  Modelo padrão  ",
      type: "CONTRACT",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Modelo padrão");
      expect(parsed.data.type).toBe("CONTRACT");
      expect(parsed.data.content).toBeUndefined();
    }
  });

  it("rejeita título vazio", () => {
    expect(
      CreateDocumentTemplateSchema.safeParse({ title: "  ", type: "PROPOSAL" })
        .success,
    ).toBe(false);
  });

  it("rejeita tipo inválido", () => {
    expect(
      CreateDocumentTemplateSchema.safeParse({ title: "X", type: "OUTRO" })
        .success,
    ).toBe(false);
  });

  it("exige tipo", () => {
    expect(CreateDocumentTemplateSchema.safeParse({ title: "X" }).success).toBe(
      false,
    );
  });
});

describe("ListDocumentTemplatesQuerySchema", () => {
  it("aceita ausência de tipo", () => {
    const parsed = ListDocumentTemplatesQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.type).toBeUndefined();
  });

  it("aceita um tipo válido", () => {
    expect(
      ListDocumentTemplatesQuerySchema.safeParse({ type: "PREMISES" }).success,
    ).toBe(true);
  });
});
