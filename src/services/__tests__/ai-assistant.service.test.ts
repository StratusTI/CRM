import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const aiRepo = vi.hoisted(() => ({
  listByWorkspaceUser: vi.fn(),
  findByIdWithMessages: vi.fn(),
  createConversation: vi.fn(),
  appendMessage: vi.fn(),
  touch: vi.fn(),
  softDelete: vi.fn(),
}));
const usageRepo = vi.hoisted(() => ({
  create: vi.fn(() => Promise.resolve(ok(undefined))),
}));
const memberRepo = vi.hoisted(() => ({ findByUserAndSlug: vi.fn() }));
const aiClient = vi.hoisted(() => ({ streamChat: vi.fn() }));
const aiEnv = vi.hoisted(() => ({
  isAiConfigured: vi.fn(() => true),
  getOpenAiModel: vi.fn(() => "gpt"),
}));
const aiTools = vi.hoisted(() => ({ AI_TOOLS: [], executeTool: vi.fn() }));

vi.mock("@/src/repositories/ai-assistant.repository", () => ({
  AiAssistantRepository: aiRepo,
}));
vi.mock("@/src/repositories/ai-usage.repository", () => ({
  AiUsageRepository: usageRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/ai/client", () => ({ streamChat: aiClient.streamChat }));
vi.mock("@/src/lib/ai/context", () => ({
  buildSystemPrompt: () => "SYSTEM",
}));
vi.mock("@/src/lib/ai/env", () => ({
  isAiConfigured: aiEnv.isAiConfigured,
  getOpenAiModel: aiEnv.getOpenAiModel,
}));
vi.mock("@/src/lib/ai/tools", () => ({
  AI_TOOLS: aiTools.AI_TOOLS,
  executeTool: aiTools.executeTool,
}));

import { AiAssistantService } from "@/src/services/ai-assistant.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv_1",
    title: "Conversa",
    workspaceId: WS,
    userId: "user_1",
    createdAt: D,
    updatedAt: D,
    deletedAt: null,
    messages: [],
    ...overrides,
  };
}

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg_1",
    conversationId: "conv_1",
    role: "ASSISTANT",
    content: "oi",
    toolCalls: null,
    createdAt: D,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS, name: "Acme" } }),
  );
}

/** Cria um async generator que emite os eventos passados. */
function streamOf(...events: unknown[]) {
  return (async function* () {
    for (const ev of events) yield ev;
  })();
}

async function collect(run: AsyncGenerator<unknown>) {
  const chunks: unknown[] = [];
  for await (const c of run) chunks.push(c);
  return chunks as { type: string; [k: string]: unknown }[];
}

beforeEach(() => {
  for (const fn of Object.values(aiRepo)) fn.mockReset();
  usageRepo.create.mockReset().mockResolvedValue(ok(undefined));
  memberRepo.findByUserAndSlug.mockReset();
  aiClient.streamChat.mockReset();
  aiEnv.isAiConfigured.mockReset().mockReturnValue(true);
  aiEnv.getOpenAiModel.mockReset().mockReturnValue("gpt");
  aiTools.executeTool.mockReset();
});

describe("AiAssistantService.listConversations / getConversation", () => {
  it("lista conversas da workspace/usuário", async () => {
    asMember();
    aiRepo.listByWorkspaceUser.mockResolvedValue(ok([conversation()]));
    const result = await AiAssistantService.listConversations("user_1", "acme");
    expect(result.ok && result.value).toHaveLength(1);
  });

  it("AI_CONVERSATION_NOT_FOUND para conversa de outro usuário", async () => {
    asMember();
    aiRepo.findByIdWithMessages.mockResolvedValue(
      ok(conversation({ userId: "outro" })),
    );
    const result = await AiAssistantService.getConversation(
      "user_1",
      "acme",
      "conv_1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_CONVERSATION_NOT_FOUND");
    }
  });

  it("deleteConversation soft-delete quando dono", async () => {
    asMember();
    aiRepo.findByIdWithMessages.mockResolvedValue(ok(conversation()));
    aiRepo.softDelete.mockResolvedValue(ok(conversation({ deletedAt: D })));
    const result = await AiAssistantService.deleteConversation(
      "user_1",
      "acme",
      "conv_1",
    );
    expect(result.ok).toBe(true);
    expect(aiRepo.softDelete).toHaveBeenCalledWith("conv_1");
  });
});

describe("AiAssistantService.streamReply", () => {
  it("AI_NOT_CONFIGURED quando a IA não está configurada", async () => {
    aiEnv.isAiConfigured.mockReturnValue(false);
    const result = await AiAssistantService.streamReply({
      userId: "user_1",
      userName: "Ana",
      slug: "acme",
      input: { message: "oi" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AI_NOT_CONFIGURED");
  });

  it("cria conversa nova e transmite texto até done", async () => {
    asMember();
    aiRepo.createConversation.mockResolvedValue(ok(conversation()));
    aiRepo.appendMessage.mockResolvedValue(ok(message()));
    aiRepo.touch.mockResolvedValue(ok(conversation()));
    aiClient.streamChat.mockReturnValue(
      streamOf(
        { type: "text", delta: "Olá" },
        {
          type: "final",
          finishReason: "stop",
          content: "Olá",
          toolCalls: [],
          usage: { inputTokens: 10, outputTokens: 5 },
        },
      ),
    );

    const result = await AiAssistantService.streamReply({
      userId: "user_1",
      userName: "Ana",
      slug: "acme",
      input: { message: "oi" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.conversationId).toBe("conv_1");

    const chunks = await collect(result.value.run);
    expect(chunks.some((c) => c.type === "text")).toBe(true);
    expect(chunks.at(-1)?.type).toBe("done");
    // registrou consumo de tokens
    expect(usageRepo.create).toHaveBeenCalled();
  });

  it("executa um round de ferramentas antes da resposta final", async () => {
    asMember();
    aiRepo.createConversation.mockResolvedValue(ok(conversation()));
    aiRepo.appendMessage.mockResolvedValue(ok(message()));
    aiRepo.touch.mockResolvedValue(ok(conversation()));
    aiTools.executeTool.mockResolvedValue("resultado da tool");
    aiClient.streamChat
      .mockReturnValueOnce(
        streamOf({
          type: "final",
          finishReason: "tool_calls",
          content: "",
          toolCalls: [{ id: "tc1", name: "buscar", args: "{}" }],
          usage: null,
        }),
      )
      .mockReturnValueOnce(
        streamOf(
          { type: "text", delta: "Pronto" },
          {
            type: "final",
            finishReason: "stop",
            content: "Pronto",
            toolCalls: [],
            usage: null,
          },
        ),
      );

    const result = await AiAssistantService.streamReply({
      userId: "user_1",
      userName: "Ana",
      slug: "acme",
      input: { message: "oi" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const chunks = await collect(result.value.run);
    expect(chunks.some((c) => c.type === "thinking")).toBe(true);
    expect(aiTools.executeTool).toHaveBeenCalledWith("buscar", "{}", {
      userId: "user_1",
      slug: "acme",
    });
    expect(chunks.at(-1)?.type).toBe("done");
  });

  it("propaga erro do provedor como chunk de erro", async () => {
    asMember();
    aiRepo.createConversation.mockResolvedValue(ok(conversation()));
    aiRepo.appendMessage.mockResolvedValue(ok(message()));
    aiClient.streamChat.mockReturnValue(
      streamOf({ type: "error", message: "falha no provedor" }),
    );

    const result = await AiAssistantService.streamReply({
      userId: "user_1",
      userName: "Ana",
      slug: "acme",
      input: { message: "oi" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const chunks = await collect(result.value.run);
    expect(chunks[0]).toMatchObject({ type: "error" });
  });

  it("usa o histórico de conversa existente", async () => {
    asMember();
    aiRepo.findByIdWithMessages.mockResolvedValue(
      ok(
        conversation({
          messages: [
            message({ id: "m0", role: "USER", content: "pergunta antiga" }),
          ],
        }),
      ),
    );
    aiRepo.appendMessage.mockResolvedValue(ok(message()));
    aiRepo.touch.mockResolvedValue(ok(conversation()));
    aiClient.streamChat.mockReturnValue(
      streamOf({
        type: "final",
        finishReason: "stop",
        content: "ok",
        toolCalls: [],
        usage: null,
      }),
    );

    const result = await AiAssistantService.streamReply({
      userId: "user_1",
      userName: "Ana",
      slug: "acme",
      input: { message: "segue", conversationId: "conv_1" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await collect(result.value.run);
    // streamChat recebeu system + histórico + nova mensagem
    const messagesArg = aiClient.streamChat.mock.calls[0][0];
    expect(messagesArg[0]).toMatchObject({ role: "system" });
    expect(messagesArg.length).toBeGreaterThanOrEqual(3);
  });
});
