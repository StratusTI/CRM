import type { EmailTemplate } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toEmailTemplateDTO } from "@/src/mappers/email-template.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

const template: EmailTemplate = {
  id: "t1",
  name: "Boas-vindas",
  subject: "Olá",
  contentHtml: "<p>oi</p>",
  contentJson: null,
  workspaceId: "w1",
  createdById: "u1",
  updatedById: null,
  createdAt: D,
  updatedAt: D,
  deletedAt: null,
};

describe("toEmailTemplateDTO", () => {
  it("serializa datas e preserva nulos", () => {
    const dto = toEmailTemplateDTO(template);
    expect(dto.deletedAt).toBeNull();
    expect(dto.updatedById).toBeNull();
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("serializa deletedAt quando presente", () => {
    const dto = toEmailTemplateDTO({ ...template, deletedAt: D });
    expect(dto.deletedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
