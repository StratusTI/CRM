import type { DocumentTemplate } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toDocumentTemplateDTO } from "@/src/mappers/document-template.mapper";

const base: DocumentTemplate = {
  id: "t1",
  title: "Modelo",
  content: "<p>oi</p>",
  type: "PORTFOLIO",
  workspaceId: "w1",
  createdById: "u1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toDocumentTemplateDTO", () => {
  it("serializa datas em ISO e preserva campos", () => {
    const dto = toDocumentTemplateDTO(base);
    expect(dto.id).toBe("t1");
    expect(dto.type).toBe("PORTFOLIO");
    expect(dto.content).toBe("<p>oi</p>");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("não expõe deletedAt no DTO", () => {
    const dto = toDocumentTemplateDTO(base);
    expect("deletedAt" in dto).toBe(false);
  });
});
