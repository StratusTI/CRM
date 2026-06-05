import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const pageRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  listViewsByWorkspace: vi.fn(),
  reorder: vi.fn(),
  metricsFor: vi.fn(),
  listMessages: vi.fn(),
  appendMessage: vi.fn(),
  softDelete: vi.fn(),
  update: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({ findByUserAndSlug: vi.fn() }));
const workspaceRepo = vi.hoisted(() => ({ findBySlug: vi.fn() }));
const aiClient = vi.hoisted(() => ({ streamChat: vi.fn() }));
const aiEnv = vi.hoisted(() => ({ isAiConfigured: vi.fn(() => true) }));
const prompt = vi.hoisted(() => ({
  buildCreateSystemPrompt: vi.fn(() => "CREATE"),
  buildEditSystemPrompt: vi.fn(() => "EDIT"),
  extractHtml: vi.fn(() => ""),
  parseRenderArgs: vi.fn(),
  RENDER_LANDING_PAGE_TOOL: { function: { name: "render_landing_page" } },
}));

vi.mock("@/src/repositories/landing-page.repository", () => ({
  LandingPageRepository: pageRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/repositories/workspace.repository", () => ({
  WorkspaceRepository: workspaceRepo,
}));
vi.mock("@/src/lib/ai/client", () => ({ streamChat: aiClient.streamChat }));
vi.mock("@/src/lib/ai/env", () => ({ isAiConfigured: aiEnv.isAiConfigured }));
vi.mock("@/src/lib/ai/landing-page-prompt", () => prompt);

import { LandingPageService } from "@/src/services/landing-page.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function page(overrides: Record<string, unknown> = {}) {
  return {
    id: "lp_1",
    title: "Promo",
    slug: "promo",
    html: "",
    status: "DRAFT",
    publishedAt: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
    position: 0,
    createdAt: D,
    updatedAt: D,
    deletedAt: null,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS, slug: "acme" } }),
  );
}

function streamOf(...events: unknown[]) {
  return (async function* () {
    for (const ev of events) yield ev;
  })();
}

async function collect(run: AsyncGenerator<unknown>) {
  const chunks: { type: string; [k: string]: unknown }[] = [];
  for await (const c of run) chunks.push(c as { type: string });
  return chunks;
}

beforeEach(() => {
  for (const fn of Object.values(pageRepo)) fn.mockReset();
  memberRepo.findByUserAndSlug.mockReset();
  workspaceRepo.findBySlug.mockReset();
  aiClient.streamChat.mockReset();
  aiEnv.isAiConfigured.mockReset().mockReturnValue(true);
  prompt.extractHtml.mockReset().mockReturnValue("");
  prompt.parseRenderArgs.mockReset();
});

describe("LandingPageService getters", () => {
  it("list mapeia viewsCount", async () => {
    asMember();
    pageRepo.listByWorkspace.mockResolvedValue(
      ok([{ ...page(), _count: { views: 4 } }]),
    );
    const result = await LandingPageService.list("user_1", "acme");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].viewsCount).toBe(4);
  });

  it("listWorkspaceViews achata visitas com título da página", async () => {
    asMember();
    pageRepo.listViewsByWorkspace.mockResolvedValue(
      ok([
        {
          id: "v1",
          landingPage: { title: "Promo" },
          ctaClicks: 2,
          durationMs: 1000,
          referrer: null,
          createdAt: D,
        },
      ]),
    );
    const result = await LandingPageService.listWorkspaceViews(
      "user_1",
      "acme",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].page).toBe("Promo");
  });

  it("getById LANDING_PAGE_NOT_FOUND para outra workspace", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page({ workspaceId: "ws_2" })));
    const result = await LandingPageService.getById("user_1", "acme", "lp_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LANDING_PAGE_NOT_FOUND");
  });

  it("remove soft-delete", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.softDelete.mockResolvedValue(ok(page({ deletedAt: D })));
    const result = await LandingPageService.remove("user_1", "acme", "lp_1");
    expect(result.ok).toBe(true);
    expect(pageRepo.softDelete).toHaveBeenCalledWith("lp_1", "user_1");
  });

  it("reorder delega ao repo", async () => {
    asMember();
    pageRepo.reorder.mockResolvedValue(ok(true));
    const result = await LandingPageService.reorder("user_1", "acme", [
      "b",
      "a",
    ]);
    expect(result.ok).toBe(true);
    expect(pageRepo.reorder).toHaveBeenCalledWith(WS, ["b", "a"]);
  });

  it("getMetrics mapeia agregados", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.metricsFor.mockResolvedValue(
      ok({
        totalViews: 10,
        avgDurationMs: 500,
        totalCtaClicks: 3,
        referrers: [],
      }),
    );
    const result = await LandingPageService.getMetrics(
      "user_1",
      "acme",
      "lp_1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.totalViews).toBe(10);
  });

  it("listMessages mapeia o histórico do chat", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.listMessages.mockResolvedValue(
      ok([
        {
          id: "m1",
          landingPageId: "lp_1",
          role: "ASSISTANT",
          content: "pronto",
          createdAt: D,
        },
      ]),
    );
    const result = await LandingPageService.listMessages(
      "user_1",
      "acme",
      "lp_1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].role).toBe("assistant");
  });
});

describe("LandingPageService.generate", () => {
  it("AI_NOT_CONFIGURED quando a IA não está pronta", async () => {
    aiEnv.isAiConfigured.mockReturnValue(false);
    const result = await LandingPageService.generate({
      userId: "user_1",
      slug: "acme",
      id: "lp_1",
      message: "crie",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AI_NOT_CONFIGURED");
  });

  it("gera HTML via tool, salva na página e emite done", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.appendMessage
      .mockResolvedValueOnce(ok({})) // mensagem do usuário
      .mockResolvedValueOnce(
        ok({
          id: "m2",
          landingPageId: "lp_1",
          role: "ASSISTANT",
          content: "resumo",
          createdAt: D,
        }),
      );
    pageRepo.update.mockResolvedValue(ok(page({ html: "<h1>oi</h1>" })));
    prompt.parseRenderArgs.mockReturnValue({
      html: "<h1>oi</h1>",
      summary: "resumo",
    });
    aiClient.streamChat.mockReturnValue(
      streamOf({
        type: "finish",
        toolCalls: [{ name: "render_landing_page", args: "{}" }],
      }),
    );

    const result = await LandingPageService.generate({
      userId: "user_1",
      slug: "acme",
      id: "lp_1",
      message: "crie",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const chunks = await collect(result.value.run);
    expect(pageRepo.update).toHaveBeenCalledWith("lp_1", {
      updatedById: "user_1",
      html: "<h1>oi</h1>",
    });
    expect(chunks.at(-1)).toMatchObject({ type: "done", html: "<h1>oi</h1>" });
  });

  it("erro quando a IA não retorna HTML válido", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.appendMessage.mockResolvedValue(ok({}));
    prompt.extractHtml.mockReturnValue("");
    aiClient.streamChat.mockReturnValue(
      streamOf(
        { type: "text", delta: "sem html" },
        { type: "finish", toolCalls: [] },
      ),
    );

    const result = await LandingPageService.generate({
      userId: "user_1",
      slug: "acme",
      id: "lp_1",
      message: "crie",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const chunks = await collect(result.value.run);
    expect(chunks.at(-1)).toMatchObject({ type: "error" });
    expect(pageRepo.update).not.toHaveBeenCalled();
  });

  it("propaga erro de stream da IA", async () => {
    asMember();
    pageRepo.findById.mockResolvedValue(ok(page()));
    pageRepo.appendMessage.mockResolvedValue(ok({}));
    aiClient.streamChat.mockReturnValue(
      streamOf({ type: "error", message: "falhou" }),
    );

    const result = await LandingPageService.generate({
      userId: "user_1",
      slug: "acme",
      id: "lp_1",
      message: "crie",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const chunks = await collect(result.value.run);
    expect(chunks[0]).toMatchObject({ type: "error", message: "falhou" });
  });
});
