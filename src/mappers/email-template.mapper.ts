import type { EmailTemplate } from "@prisma/client";
import type { EmailTemplateDTO } from "@/src/schemas/email-template.schema";

export function toEmailTemplateDTO(template: EmailTemplate): EmailTemplateDTO {
  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    contentHtml: template.contentHtml,
    contentJson: template.contentJson,
    workspaceId: template.workspaceId,
    createdById: template.createdById,
    updatedById: template.updatedById,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    deletedAt:
      template.deletedAt === null ? null : template.deletedAt.toISOString(),
  };
}
