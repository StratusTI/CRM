import type { AiConversation, AiMessage, AiMessageRole } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type AiConversationWithMessages = AiConversation & {
  messages: AiMessage[];
};

export type AppendMessageData = {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  toolCalls?: unknown;
};

/** Acesso a dados das conversas/mensagens do agente. Só Prisma. */
export const AiAssistantRepository = {
  async createConversation(
    workspaceId: string,
    userId: string,
    title: string | null,
  ): Promise<Result<AiConversation>> {
    try {
      const conversation = await prisma.aiConversation.create({
        data: { workspaceId, userId, title },
      });
      return ok(conversation);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspaceUser(
    workspaceId: string,
    userId: string,
  ): Promise<Result<AiConversation[]>> {
    try {
      const conversations = await prisma.aiConversation.findMany({
        where: { workspaceId, userId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      });
      return ok(conversations);
    } catch {
      return err(databaseError());
    }
  },

  async findByIdWithMessages(
    id: string,
  ): Promise<Result<AiConversationWithMessages | null>> {
    try {
      const conversation = await prisma.aiConversation.findUnique({
        where: { id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      return ok(conversation);
    } catch {
      return err(databaseError());
    }
  },

  async appendMessage(data: AppendMessageData): Promise<Result<AiMessage>> {
    try {
      const { conversationId, role, content, toolCalls } = data;
      const message = await prisma.aiMessage.create({
        data: {
          conversationId,
          role,
          content,
          toolCalls: (toolCalls ?? undefined) as never,
        },
      });
      return ok(message);
    } catch {
      return err(databaseError());
    }
  },

  /** Atualiza updatedAt (e título, quando informado) da conversa. */
  async touch(
    id: string,
    title?: string | null,
  ): Promise<Result<AiConversation>> {
    try {
      const conversation = await prisma.aiConversation.update({
        where: { id },
        data: title === undefined ? { updatedAt: new Date() } : { title },
      });
      return ok(conversation);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string): Promise<Result<AiConversation>> {
    try {
      const conversation = await prisma.aiConversation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return ok(conversation);
    } catch {
      return err(databaseError());
    }
  },
};
