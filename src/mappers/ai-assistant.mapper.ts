import type { AiConversation, AiMessage } from "@prisma/client";
import type {
  AiConversationDTO,
  AiMessageDTO,
} from "@/src/schemas/ai-assistant.schema";

/** `Prisma.AiMessage` → `AiMessageDTO` (role em minúsculo, sem toolCalls). */
export function toAiMessageDTO(message: AiMessage): AiMessageDTO {
  return {
    id: message.id,
    role: message.role === "ASSISTANT" ? "assistant" : "user",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

/** `Prisma.AiConversation` (+ messages opcional) → `AiConversationDTO`. */
export function toAiConversationDTO(
  conversation: AiConversation & { messages?: AiMessage[] },
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
