import type { AiMessage } from "@prisma/client";
import {
  aiConversationNotFound,
  aiNotConfigured,
} from "@/src/errors/app-error";
import type { ChatMessage, ToolCallPayload } from "@/src/lib/ai/client";
import { streamChat } from "@/src/lib/ai/client";
import { buildSystemPrompt } from "@/src/lib/ai/context";
import { isAiConfigured } from "@/src/lib/ai/env";
import { AI_TOOLS, executeTool } from "@/src/lib/ai/tools";
import { err, ok, type Result } from "@/src/lib/result";
import {
  toAiConversationDTO,
  toAiMessageDTO,
} from "@/src/mappers/ai-assistant.mapper";
import {
  AiAssistantRepository,
  type AiConversationWithMessages,
} from "@/src/repositories/ai-assistant.repository";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import type {
  AiConversationDTO,
  AiMessageDTO,
  SendAiMessageInput,
} from "@/src/schemas/ai-assistant.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

const MAX_TOOL_ROUNDS = 5;
const MAX_HISTORY = 20;
const TITLE_MAX = 60;
const EMPTY_REPLY = "Não consegui gerar uma resposta. Tente reformular.";

/** Chunk emitido pelo loop de agente, consumido pela rota como SSE. */
export type ReplyChunk =
  | { type: "text"; delta: string }
  | { type: "done"; conversationId: string; message: AiMessageDTO }
  | { type: "error"; message: string };

export const AiAssistantService = {
  async listConversations(
    userId: string,
    slug: string,
  ): Promise<Result<AiConversationDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await AiAssistantRepository.listByWorkspaceUser(
      ws.value,
      userId,
    );
    if (!result.ok) return result;
    return ok(result.value.map((c) => toAiConversationDTO(c)));
  },

  async getConversation(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<AiConversationDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const loaded = await loadOwned(ws.value, userId, id);
    if (!loaded.ok) return loaded;
    return ok(toAiConversationDTO(loaded.value));
  },

  async deleteConversation(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<AiConversationDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const loaded = await loadOwned(ws.value, userId, id);
    if (!loaded.ok) return loaded;

    const removed = await AiAssistantRepository.softDelete(id);
    if (!removed.ok) return removed;
    return ok(toAiConversationDTO(removed.value));
  },

  /**
   * Faz o pré-voo (workspace, configuração, conversa, persistência da mensagem
   * do usuário) e devolve o `conversationId` + um gerador que roda o loop de
   * agente, transmite o texto e persiste a resposta ao final.
   */
  async streamReply(params: {
    userId: string;
    userName: string;
    slug: string;
    input: SendAiMessageInput;
  }): Promise<
    Result<{ conversationId: string; run: AsyncGenerator<ReplyChunk> }>
  > {
    const { userId, userName, slug, input } = params;

    if (!isAiConfigured()) return err(aiNotConfigured());

    const membership = await MembershipRepository.findByUserAndSlug(
      userId,
      slug,
    );
    if (!membership.ok) return membership;
    if (!membership.value) return err(aiConversationNotFound());
    const { id: workspaceId, name: workspaceName } = membership.value.workspace;

    // Garante a conversa (cria ou valida posse) e monta o histórico.
    let conversationId: string;
    let history: ChatMessage[];
    if (input.conversationId) {
      const loaded = await loadOwned(workspaceId, userId, input.conversationId);
      if (!loaded.ok) return loaded;
      conversationId = loaded.value.id;
      history = toChatHistory(loaded.value);
    } else {
      const created = await AiAssistantRepository.createConversation(
        workspaceId,
        userId,
        deriveTitle(input.message),
      );
      if (!created.ok) return created;
      conversationId = created.value.id;
      history = [];
    }

    // Persiste a mensagem do usuário.
    const savedUser = await AiAssistantRepository.appendMessage({
      conversationId,
      role: "USER",
      content: input.message,
    });
    if (!savedUser.ok) return savedUser;

    const system = buildSystemPrompt({
      workspaceName,
      userName,
      now: new Date(),
    });
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: input.message },
    ];

    return ok({
      conversationId,
      run: runAgent({ userId, slug, conversationId, messages }),
    });
  },
};

/** Loop de agente: alterna chamadas ao modelo e execução de tools. */
async function* runAgent(ctx: {
  userId: string;
  slug: string;
  conversationId: string;
  messages: ChatMessage[];
}): AsyncGenerator<ReplyChunk> {
  const { userId, slug, conversationId, messages } = ctx;
  let assistantText = "";
  const usedTools: { name: string; args: string }[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let finishReason: string | null = null;
    let roundContent = "";
    let toolCalls: { id: string; name: string; args: string }[] = [];

    for await (const ev of streamChat(messages, AI_TOOLS)) {
      if (ev.type === "text") {
        assistantText += ev.delta;
        yield { type: "text", delta: ev.delta };
      } else if (ev.type === "error") {
        yield { type: "error", message: ev.message };
        return;
      } else {
        finishReason = ev.finishReason;
        roundContent = ev.content;
        toolCalls = ev.toolCalls;
      }
    }

    if (finishReason === "tool_calls" && toolCalls.length > 0) {
      const payloads: ToolCallPayload[] = toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.args },
      }));
      messages.push({
        role: "assistant",
        content: roundContent || null,
        tool_calls: payloads,
      });
      for (const tc of toolCalls) {
        usedTools.push({ name: tc.name, args: tc.args });
        const result = await executeTool(tc.name, tc.args, { userId, slug });
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    break;
  }

  const content = assistantText.trim() || EMPTY_REPLY;
  const saved = await AiAssistantRepository.appendMessage({
    conversationId,
    role: "ASSISTANT",
    content,
    toolCalls: usedTools.length > 0 ? usedTools : undefined,
  });
  await AiAssistantRepository.touch(conversationId);

  const message: AiMessageDTO = saved.ok
    ? toAiMessageDTO(saved.value)
    : {
        id: "",
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
      };
  yield { type: "done", conversationId, message };
}

/** Carrega a conversa garantindo posse (workspace + usuário) e não-deletada. */
async function loadOwned(
  workspaceId: string,
  userId: string,
  id: string,
): Promise<Result<AiConversationWithMessages>> {
  const found = await AiAssistantRepository.findByIdWithMessages(id);
  if (!found.ok) return found;
  const conversation = found.value;
  if (
    !conversation ||
    conversation.workspaceId !== workspaceId ||
    conversation.userId !== userId ||
    conversation.deletedAt
  ) {
    return err(aiConversationNotFound());
  }
  return ok(conversation);
}

function toChatHistory(
  conversation: AiConversationWithMessages,
): ChatMessage[] {
  return conversation.messages
    .slice(-MAX_HISTORY)
    .map(
      (m: AiMessage): ChatMessage =>
        m.role === "ASSISTANT"
          ? { role: "assistant", content: m.content }
          : { role: "user", content: m.content },
    );
}

function deriveTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  return trimmed.length > TITLE_MAX
    ? `${trimmed.slice(0, TITLE_MAX)}…`
    : trimmed;
}
