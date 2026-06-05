import type { AiConversation, AiMessageRole, Prisma } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import type { ProcessedAttachment } from "@/src/lib/ai/attachments";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

/** Mensagem do agente com seus anexos carregados. */
export type AiMessageWithAttachments = Prisma.AiMessageGetPayload<{
  include: { attachments: true };
}>;

export type AiConversationWithMessages = AiConversation & {
  messages: AiMessageWithAttachments[];
};

export type AppendMessageData = {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  toolCalls?: unknown;
  attachments?: ProcessedAttachment[];
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
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { attachments: true },
          },
        },
      });
      return ok(conversation);
    } catch {
      return err(databaseError());
    }
  },

  async appendMessage(
    data: AppendMessageData,
  ): Promise<Result<AiMessageWithAttachments>> {
    try {
      const { conversationId, role, content, toolCalls, attachments } = data;
      const message = await prisma.aiMessage.create({
        data: {
          conversationId,
          role,
          content,
          toolCalls: (toolCalls ?? undefined) as never,
          ...(attachments && attachments.length > 0
            ? {
                attachments: {
                  create: attachments.map((a) => ({
                    kind: a.kind,
                    filename: a.filename,
                    contentType: a.contentType,
                    size: a.size,
                    storageKey: a.storageKey,
                    extractedText: a.extractedText,
                  })),
                },
              }
            : {}),
        },
        include: { attachments: true },
      });
      return ok(message);
    } catch {
      return err(databaseError());
    }
  },

  /** Busca um anexo garantindo que pertence a uma mensagem da conversa dada. */
  async findAttachmentForConversation(
    attachmentId: string,
    conversationId: string,
  ): Promise<Result<{ storageKey: string; contentType: string } | null>> {
    try {
      const attachment = await prisma.aiAttachment.findFirst({
        where: {
          id: attachmentId,
          aiMessage: { conversationId },
        },
        select: { storageKey: true, contentType: true },
      });
      return ok(attachment);
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
