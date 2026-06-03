import type { DocumentTemplate } from "@prisma/client";
import type { DocumentTemplateDTO } from "@/src/schemas/document-template.schema";

/** `Prisma.DocumentTemplate` → `DocumentTemplateDTO` (datas em ISO). */
export function toDocumentTemplateDTO(
  template: DocumentTemplate,
): DocumentTemplateDTO {
  return {
    id: template.id,
    title: template.title,
    content: template.content,
    type: template.type,
    workspaceId: template.workspaceId,
    createdById: template.createdById,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
