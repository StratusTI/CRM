import type { AiAttachment } from "@prisma/client";
import type { AiAttachmentDTO } from "@/src/schemas/ai-attachment.schema";

/** `Prisma.AiAttachment` → DTO (só metadados; os bytes vão pela rota própria). */
export function toAiAttachmentDTO(a: AiAttachment): AiAttachmentDTO {
  return {
    id: a.id,
    kind: a.kind,
    filename: a.filename,
    contentType: a.contentType,
    size: a.size,
  };
}
