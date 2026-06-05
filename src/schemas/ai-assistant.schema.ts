import { z } from "zod";
import { AiAttachmentOutputSchema } from "./ai-attachment.schema";

/**
 * Contrato da feature AI Assistant (agente conversacional do workspace).
 * O agente é somente-leitura: consulta dados via tools, nunca altera registros.
 */

export const AI_MESSAGE_ROLES = ["user", "assistant"] as const;
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number];

const IdSchema = z.string().trim().min(1);

/**
 * Entrada do endpoint de chat (stream). `message` pode vir vazio quando há
 * anexos (o turno é só os arquivos); a rota valida "mensagem ou anexo".
 */
export const SendAiMessageSchema = z.object({
  conversationId: IdSchema.optional(),
  message: z.string().trim().max(4000, "Mensagem muito longa"),
});

export const AiMessageOutputSchema = z.object({
  id: z.string(),
  role: z.enum(AI_MESSAGE_ROLES),
  content: z.string(),
  createdAt: z.string(),
  attachments: z.array(AiAttachmentOutputSchema).optional(),
});

export const AiConversationOutputSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(AiMessageOutputSchema).optional(),
});

export type SendAiMessageInput = z.infer<typeof SendAiMessageSchema>;
export type AiMessageDTO = z.infer<typeof AiMessageOutputSchema>;
export type AiConversationDTO = z.infer<typeof AiConversationOutputSchema>;
