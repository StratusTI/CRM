import { z } from "zod";

/**
 * DTO de um anexo de IA (imagem ou documento) exibido no histórico do chat.
 * Os bytes não trafegam aqui — o cliente monta a URL de download/preview a
 * partir do `id` (rota `.../attachments/<id>`). `kind` decide a renderização:
 * IMAGE vira miniatura, DOCUMENT vira chip com nome do arquivo.
 */
export const AI_ATTACHMENT_KINDS = ["IMAGE", "DOCUMENT"] as const;
export type AiAttachmentKindValue = (typeof AI_ATTACHMENT_KINDS)[number];

export const AiAttachmentOutputSchema = z.object({
  id: z.string(),
  kind: z.enum(AI_ATTACHMENT_KINDS),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int(),
});

export type AiAttachmentDTO = z.infer<typeof AiAttachmentOutputSchema>;
