import type { AiAttachment, AiConversation, AiMessage } from "@prisma/client";
import type {
  AiConversationDTO,
  AiMessageDTO,
} from "@/src/schemas/ai-assistant.schema";
import { toAiAttachmentDTO } from "./ai-attachment.mapper";

type AiMessageMaybeAttachments = AiMessage & { attachments?: AiAttachment[] };

/** `Prisma.AiMessage` → `AiMessageDTO` (role em minúsculo, sem toolCalls). */
export function toAiMessageDTO(
  message: AiMessageMaybeAttachments,
): AiMessageDTO {
  return {
    id: message.id,
    role: message.role === "ASSISTANT" ? "assistant" : "user",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    ...(message.attachments && message.attachments.length > 0
      ? { attachments: message.attachments.map(toAiAttachmentDTO) }
      : {}),
  };
}

/** `Prisma.AiConversation` (+ messages opcional) → `AiConversationDTO`. */
export function toAiConversationDTO(
  conversation: AiConversation & { messages?: AiMessageMaybeAttachments[] },
): AiConversationDTO {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    ...(conversation.messages && {
      messages: conversation.messages.map(toAiMessageDTO),
    }),
  };
}
