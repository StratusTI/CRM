import {
  aiConversationNotFound,
  aiNotConfigured,
} from "@/src/errors/app-error";
import {
  type AttachmentForContent,
  buildUserContent,
  type ProcessedAttachment,
  processUploads,
} from "@/src/lib/ai/attachments";
import type { ChatMessage, ToolCallPayload } from "@/src/lib/ai/client";
import { streamChat } from "@/src/lib/ai/client";
import { buildSystemPrompt } from "@/src/lib/ai/context";
import { getOpenAiModel, isAiConfigured } from "@/src/lib/ai/env";
import { AI_TOOLS, executeTool } from "@/src/lib/ai/tools";
import { err, ok, type Result } from "@/src/lib/result";
import { getObjectBytes } from "@/src/lib/storage/s3";
import {
  toAiConversationDTO,
  toAiMessageDTO,
} from "@/src/mappers/ai-assistant.mapper";
import {
  AiAssistantRepository,
  type AiConversationWithMessages,
  type AiMessageWithAttachments,
} from "@/src/repositories/ai-assistant.repository";
import { AiUsageRepository } from "@/src/repositories/ai-usage.repository";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import type {
  AiConversationDTO,
  AiMessageDTO,
  SendAiMessageInput,
} from "@/src/schemas/ai-assistant.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Rounds de tool_call por pergunta (cada round = 1 chamada ao modelo). */
const MAX_TOOL_ROUNDS = 10;
/**
 * Mensagens de histórico preservadas no contexto de uma conversa existente.
 * Mantemos mais para evitar que o modelo "esqueça" pesquisas anteriores.
 */
const MAX_HISTORY = 40;
const TITLE_MAX = 60;
const EMPTY_REPLY = "Não consegui gerar uma resposta. Tente reformular.";

/** Chunk emitido pelo loop de agente, consumido pela rota como SSE. */
export type ReplyChunk =
  | { type: "user"; message: AiMessageDTO }
  | { type: "text"; delta: string }
  | { type: "thinking"; tools: string[] }
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
    files?: File[];
  }): Promise<
    Result<{ conversationId: string; run: AsyncGenerator<ReplyChunk> }>
  > {
    const { userId, userName, slug, input, files = [] } = params;

    if (!isAiConfigured()) return err(aiNotConfigured());

    const membership = await MembershipRepository.findByUserAndSlug(
      userId,
      slug,
    );
    if (!membership.ok) return membership;
    if (!membership.value) return err(aiConversationNotFound());
    const { id: workspaceId, name: workspaceName } = membership.value.workspace;

    // Processa anexos (sobe ao MinIO + extrai texto) antes de persistir.
    const processed = await processUploads(files, `ai/${workspaceId}`);
    if (!processed.ok) return processed;

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
        deriveTitle(input.message, processed.value),
      );
      if (!created.ok) return created;
      conversationId = created.value.id;
      history = [];
    }

    // Persiste a mensagem do usuário (com seus anexos).
    const savedUser = await AiAssistantRepository.appendMessage({
      conversationId,
      role: "USER",
      content: input.message,
      attachments: processed.value,
    });
    if (!savedUser.ok) return savedUser;

    const system = buildSystemPrompt({
      workspaceName,
      userName,
      now: new Date(),
    });
    // Anexos do turno alimentam o modelo: docs como texto, imagens como vision.
    const userContent = buildUserContent(
      input.message,
      processed.value.map(toContentAttachment),
    );
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: userContent },
    ];

    return ok({
      conversationId,
      run: runAgent({
        userId,
        slug,
        conversationId,
        workspaceId,
        messages,
        hasAttachments: processed.value.length > 0,
        userMessage: savedUser.value,
      }),
    });
  },

  /**
   * Baixa os bytes de um anexo de uma conversa, escopado por workspace/usuário.
   * Usado pela rota de download para servir miniaturas e documentos.
   */
  async getAttachment(
    userId: string,
    slug: string,
    conversationId: string,
    attachmentId: string,
  ): Promise<Result<{ bytes: ArrayBuffer; contentType: string }>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    // Garante posse da conversa antes de servir o anexo.
    const loaded = await loadOwned(ws.value, userId, conversationId);
    if (!loaded.ok) return loaded;

    const found = await AiAssistantRepository.findAttachmentForConversation(
      attachmentId,
      conversationId,
    );
    if (!found.ok) return found;
    if (!found.value) return err(aiConversationNotFound());

    const data = await getObjectBytes(found.value.storageKey);
    return ok({ bytes: data.bytes, contentType: found.value.contentType });
  },
};

/** Mapeia um anexo processado para o formato de montagem de conteúdo. */
function toContentAttachment(a: ProcessedAttachment): AttachmentForContent {
  return {
    kind: a.kind,
    filename: a.filename,
    extractedText: a.extractedText,
    dataUrl: a.dataUrl,
  };
}

/** Loop de agente: alterna chamadas ao modelo e execução de tools. */
async function* runAgent(ctx: {
  userId: string;
  slug: string;
  conversationId: string;
  workspaceId: string;
  messages: ChatMessage[];
  hasAttachments: boolean;
  userMessage: AiMessageWithAttachments;
}): AsyncGenerator<ReplyChunk> {
  const {
    userId,
    slug,
    conversationId,
    workspaceId,
    messages,
    hasAttachments,
  } = ctx;
  let assistantText = "";
  const usedTools: { name: string; args: string }[] = [];

  // Espelha no chat a mensagem persistida do usuário (com seus anexos).
  yield { type: "user", message: toAiMessageDTO(ctx.userMessage) };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let finishReason: string | null = null;
    let roundContent = "";
    let toolCalls: { id: string; name: string; args: string }[] = [];

    /*
     * Round 0: tool_choice "required" força o modelo a consultar pelo menos
     * uma ferramenta do workspace antes de compor a resposta final. Rounds
     * subsequentes usam "auto" — o modelo decide se precisa de mais dados.
     *
     * Exceção: quando há anexos no turno, usamos "auto" já no round 0 — a
     * pergunta pode ser respondida a partir do material anexado (ex.: "use
     * esta paleta"), sem forçar uma consulta ao workspace.
     */
    const toolChoice = round === 0 && !hasAttachments ? "required" : "auto";

    for await (const ev of streamChat(messages, AI_TOOLS, toolChoice)) {
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
        if (ev.usage) {
          AiUsageRepository.create({
            workspaceId,
            conversationId,
            inputTokens: ev.usage.inputTokens,
            outputTokens: ev.usage.outputTokens,
            model: getOpenAiModel(),
          }).catch(() => {});
        }
      }
    }

    if (finishReason === "tool_calls" && toolCalls.length > 0) {
      // Sinaliza ao cliente quais ferramentas serão consultadas.
      yield { type: "thinking", tools: toolCalls.map((tc) => tc.name) };

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

      // Executa todas as tools do round em paralelo.
      const results = await Promise.all(
        toolCalls.map((tc) => executeTool(tc.name, tc.args, { userId, slug })),
      );

      for (let i = 0; i < toolCalls.length; i++) {
        usedTools.push({ name: toolCalls[i].name, args: toolCalls[i].args });
        messages.push({
          role: "tool",
          content: results[i],
          tool_call_id: toolCalls[i].id,
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

/**
 * Reconstrói o histórico de mensagens para o contexto da API.
 * Anota os turns do assistente com as ferramentas já consultadas, evitando
 * que o modelo repita pesquisas desnecessárias em perguntas de acompanhamento.
 */
function toChatHistory(
  conversation: AiConversationWithMessages,
): ChatMessage[] {
  return conversation.messages
    .slice(-MAX_HISTORY)
    .map((m: AiMessageWithAttachments): ChatMessage => {
      if (m.role === "ASSISTANT") {
        const toolsUsed =
          m.toolCalls && Array.isArray(m.toolCalls) && m.toolCalls.length > 0
            ? (m.toolCalls as { name: string }[]).map((t) => t.name)
            : [];
        const annotation =
          toolsUsed.length > 0
            ? `\n\n[Dados consultados nesta resposta via ferramentas: ${toolsUsed.join(", ")}]`
            : "";
        return { role: "assistant", content: m.content + annotation };
      }
      // Reinjeta o texto dos documentos anexados (cacheado) em turns antigos.
      // Imagens viram nota textual (dataUrl nulo) para conter o custo de tokens.
      if (m.attachments.length > 0) {
        const content = buildUserContent(
          m.content,
          m.attachments.map((a) => ({
            kind: a.kind,
            filename: a.filename,
            extractedText: a.extractedText,
            dataUrl: null,
          })),
        );
        return { role: "user", content };
      }
      return { role: "user", content: m.content };
    });
}

/** Título da conversa a partir da 1ª mensagem; cai para os anexos se vazia. */
function deriveTitle(
  message: string,
  attachments: ProcessedAttachment[],
): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return attachments[0]?.filename.slice(0, TITLE_MAX) ?? "Nova conversa";
  }
  return trimmed.length > TITLE_MAX
    ? `${trimmed.slice(0, TITLE_MAX)}…`
    : trimmed;
}
