import { describe, expect, it } from "vitest";
import {
  CreateEmailTemplateSchema,
  EmailTemplateOutputSchema,
  UpdateEmailTemplateSchema,
} from "@/src/schemas/email-template.schema";

describe("CreateEmailTemplateSchema", () => {
  it("aceita só o nome com defaults vazios", () => {
    const parsed = CreateEmailTemplateSchema.safeParse({ name: "Boas-vindas" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subject).toBe("");
      expect(parsed.data.contentHtml).toBe("");
    }
  });

  it("rejeita nome vazio", () => {
    expect(CreateEmailTemplateSchema.safeParse({ name: " " }).success).toBe(
      false,
    );
  });
});

describe("UpdateEmailTemplateSchema", () => {
  it("aceita atualização parcial de um campo", () => {
    expect(
      UpdateEmailTemplateSchema.safeParse({ subject: "Novo" }).success,
    ).toBe(true);
  });

  it("rejeita update vazio", () => {
    expect(UpdateEmailTemplateSchema.safeParse({}).success).toBe(false);
  });
});

describe("EmailTemplateOutputSchema", () => {
  it("valida um DTO completo", () => {
    expect(
      EmailTemplateOutputSchema.safeParse({
        id: "t_1",
        name: "T",
        subject: "S",
        contentHtml: "<p></p>",
        contentJson: null,
        workspaceId: "ws_1",
        createdById: "u_1",
        updatedById: null,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        deletedAt: null,
      }).success,
    ).toBe(true);
  });
});
