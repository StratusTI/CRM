import { createHash } from "node:crypto";
import type { LandingPage } from "@prisma/client";
import {
  aiNotConfigured,
  landingPageNotFound,
  landingPageNotPublished,
  landingPageSlugTaken,
} from "@/src/errors/app-error";
import { streamChat } from "@/src/lib/ai/client";
import { isAiConfigured } from "@/src/lib/ai/env";
import {
  buildCreateSystemPrompt,
  buildEditSystemPrompt,
  extractHtml,
  parseRenderArgs,
  RENDER_LANDING_PAGE_TOOL,
} from "@/src/lib/ai/landing-page-prompt";
import { err, ok, type Result } from "@/src/lib/result";
import {
  type LandingPageViewRow,
  toLandingPageDTO,
  toLandingPageListItemDTO,
  toLandingPageMessageDTO,
  toLandingPageMetricsDTO,
  toLandingPageViewRow,
  toPublicLandingPageDTO,
} from "@/src/mappers/landing-page.mapper";
import {
  LandingPageRepository,
  type UpdateLandingPageData,
} from "@/src/repositories/landing-page.repository";
import { WorkspaceRepository } from "@/src/repositories/workspace.repository";
import type {
  CreateLandingPageInput,
  LandingPageDTO,
  LandingPageMessageDTO,
  LandingPageMetricsDTO,
  PublicLandingPageDTO,
  RecordLandingEventInput,
  UpdateLandingPageInput,
} from "@/src/schemas/landing-page.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/**
 * Deriva um slug base a partir do título (kebab-case, sem acentos). Vazio vira
 * "pagina" para nunca produzir slug em branco.
 */
function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return base || "pagina";
}

/**
 * Diz se o slug atual ainda é o derivado automaticamente do título (incluindo
 * sufixo numérico de desambiguação, ex.: "promo-2"). Quando verdadeiro, o slug
 * pode acompanhar uma renomeação; se o usuário tiver definido um slug próprio,
 * não o sobrescrevemos.
 */
function isAutoSlug(slug: string, title: string): boolean {
  const base = slugify(title);
  if (slug === base) return true;
  if (!slug.startsWith(`${base}-`)) return false;
  return /^\d+$/.test(slug.slice(base.length + 1));
}

/**
 * Hash salgado do IP do visitante. Nunca guardamos o IP cru (LGPD); o hash só
 * serve para contar visitantes únicos. Salgado com o secret do servidor.
 */
function hashIp(ip: string): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? "nexo-landing-page";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Acha um slug livre no workspace, anexando sufixo numérico em colisão. */
async function uniqueSlug(
  workspaceId: string,
  desired: string,
  exceptId?: string,
): Promise<Result<string>> {
  let candidate = desired;
  for (let n = 2; n < 1000; n++) {
    const exists = await LandingPageRepository.slugExists(
      workspaceId,
      candidate,
      exceptId,
    );
    if (!exists.ok) return exists;
    if (!exists.value) return ok(candidate);
    candidate = `${desired}-${n}`;
  }
  return err(landingPageSlugTaken());
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<LandingPage>> {
  const found = await LandingPageRepository.findById(id);
  if (!found.ok) return found;
  const page = found.value;
  if (!page || page.workspaceId !== workspaceId || page.deletedAt) {
    return err(landingPageNotFound());
  }
  return ok(page);
}

/** Contexto da visita pública, extraído do request (nunca do corpo). */
export type LandingViewContext = { ip: string; referrer: string | null };

/** Chunk emitido pelo gerador de IA, consumido pela rota como SSE. */
export type GenerateChunk =
  | { type: "text"; delta: string }
  | { type: "done"; html: string; message: LandingPageMessageDTO }
  | { type: "error"; message: string };

export const LandingPageService = {
  async create(
    userId: string,
    slug: string,
    input: CreateLandingPageInput,
  ): Promise<Result<LandingPageDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const pageSlug = await uniqueSlug(ws.value, slugify(input.title));
    if (!pageSlug.ok) return pageSlug;

    const created = await LandingPageRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      title: input.title,
      slug: pageSlug.value,
      html: input.html ?? "",
    });
    if (!created.ok) return created;
    return ok(toLandingPageDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<LandingPageDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await LandingPageRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toLandingPageListItemDTO));
  },

  /** Linhas planas de todas as visitas do workspace (fonte de dashboard). */
  async listWorkspaceViews(
    userId: string,
    slug: string,
  ): Promise<Result<LandingPageViewRow[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await LandingPageRepository.listViewsByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toLandingPageViewRow));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LandingPageDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const page = await loadInWorkspace(ws.value, id);
    if (!page.ok) return page;
    return ok(toLandingPageDTO(page.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateLandingPageInput,
  ): Promise<Result<LandingPageDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const data: UpdateLandingPageData = { updatedById: userId, ...input };

    // Renomeou o título sem mexer no slug: o slug acompanha o novo título,
    // desde que ainda seja o derivado automaticamente (nunca sobrescreve um
    // slug customizado). Garante unicidade no workspace.
    if (
      input.slug === undefined &&
      input.title !== undefined &&
      input.title !== existing.value.title &&
      isAutoSlug(existing.value.slug, existing.value.title)
    ) {
      const fresh = await uniqueSlug(ws.value, slugify(input.title), id);
      if (!fresh.ok) return fresh;
      data.slug = fresh.value;
    }

    // Slug editado: garante unicidade (rejeita colisão explícita).
    if (input.slug !== undefined && input.slug !== existing.value.slug) {
      const taken = await LandingPageRepository.slugExists(
        ws.value,
        input.slug,
        id,
      );
      if (!taken.ok) return taken;
      if (taken.value) return err(landingPageSlugTaken());
    }

    // Carimba o 1º publish; despublicar não apaga o timestamp original.
    if (input.status === "PUBLISHED" && !existing.value.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await LandingPageRepository.update(id, data);
    if (!updated.ok) return updated;
    return ok(toLandingPageDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LandingPageDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await LandingPageRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toLandingPageDTO(removed.value));
  },

  /** Persiste a ordem manual das páginas (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return LandingPageRepository.reorder(ws.value, ids);
  },

  async getMetrics(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LandingPageMetricsDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const page = await loadInWorkspace(ws.value, id);
    if (!page.ok) return page;

    const metrics = await LandingPageRepository.metricsFor(id);
    if (!metrics.ok) return metrics;
    return ok(toLandingPageMetricsDTO(metrics.value));
  },

  /** Histórico do chat de geração de uma página. */
  async listMessages(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LandingPageMessageDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const page = await loadInWorkspace(ws.value, id);
    if (!page.ok) return page;

    const messages = await LandingPageRepository.listMessages(id);
    if (!messages.ok) return messages;
    return ok(messages.value.map(toLandingPageMessageDTO));
  },

  /**
   * Pré-voo da geração por IA (workspace, configuração, posse, persistência da
   * mensagem do usuário) e devolve um gerador que transmite o texto, salva o
   * HTML resultante na página e persiste a resposta do assistente ao final.
   */
  async generate(params: {
    userId: string;
    slug: string;
    id: string;
    message: string;
  }): Promise<Result<{ run: AsyncGenerator<GenerateChunk> }>> {
    const { userId, slug, id, message } = params;

    if (!isAiConfigured()) return err(aiNotConfigured());

    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const saved = await LandingPageRepository.appendMessage({
      landingPageId: id,
      role: "USER",
      content: message,
    });
    if (!saved.ok) return saved;

    return ok({
      run: runGenerate({ userId, pageId: id, page: existing.value, message }),
    });
  },

  /* --------------------------- público (sem auth) ------------------------ */

  /** Resolve a página pelo (slug do workspace, slug da página) — só PUBLISHED. */
  async getPublicBySlug(
    workspaceSlug: string,
    pageSlug: string,
  ): Promise<Result<PublicLandingPageDTO>> {
    const ws = await WorkspaceRepository.findBySlug(workspaceSlug);
    if (!ws.ok) return ws;
    if (!ws.value) return err(landingPageNotFound());

    const found = await LandingPageRepository.findPublishedBySlug(
      ws.value.id,
      pageSlug,
    );
    if (!found.ok) return found;
    if (!found.value) return err(landingPageNotFound());
    if (found.value.status !== "PUBLISHED") {
      return err(landingPageNotPublished());
    }
    return ok(toPublicLandingPageDTO(found.value));
  },

  /** Registra/atualiza um acesso (beacon da página pública). */
  async recordEvent(
    workspaceSlug: string,
    pageSlug: string,
    input: RecordLandingEventInput,
    ctx: LandingViewContext,
  ): Promise<Result<true>> {
    const ws = await WorkspaceRepository.findBySlug(workspaceSlug);
    if (!ws.ok) return ws;
    if (!ws.value) return err(landingPageNotFound());

    const found = await LandingPageRepository.findPublishedBySlug(
      ws.value.id,
      pageSlug,
    );
    if (!found.ok) return found;
    if (!found.value) return err(landingPageNotFound());
    if (found.value.status !== "PUBLISHED") {
      return err(landingPageNotPublished());
    }

    return LandingPageRepository.recordEvent({
      landingPageId: found.value.id,
      viewId: input.viewId,
      ipHash: hashIp(ctx.ip),
      durationMs: input.durationMs,
      ctaClicks: input.ctaClicks,
      referrer: ctx.referrer,
    });
  },
};

/** Orçamento de saída amplo: uma landing page inteira não cabe nos 4k padrão. */
const LANDING_PAGE_MAX_TOKENS = 16_000;
/** Um pouco mais de criatividade que o chat (0.3) rende layouts mais ricos. */
const LANDING_PAGE_TEMPERATURE = 0.5;
const DEFAULT_DONE_MESSAGE = "Pronto! Atualizei a página com sua solicitação.";

/**
 * Loop de geração: chama o modelo forçando a tool `render_landing_page`, que
 * devolve o documento final num campo estruturado (html) + um resumo. Salva o
 * HTML na página e persiste o resumo como mensagem do assistente. Cai para o
 * parsing de texto livre caso o modelo não use a tool.
 */
async function* runGenerate(ctx: {
  userId: string;
  pageId: string;
  page: LandingPage;
  message: string;
}): AsyncGenerator<GenerateChunk> {
  const { userId, pageId, page, message } = ctx;

  const system = page.html.trim()
    ? buildEditSystemPrompt(page.html)
    : buildCreateSystemPrompt();

  let html = "";
  let summary = "";
  let rawContent = "";
  for await (const ev of streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: message },
    ],
    [RENDER_LANDING_PAGE_TOOL],
    "required",
    {
      maxTokens: LANDING_PAGE_MAX_TOKENS,
      temperature: LANDING_PAGE_TEMPERATURE,
    },
  )) {
    if (ev.type === "text") {
      // Com tool forçada quase não há texto livre; acumulamos só p/ fallback.
      rawContent += ev.delta;
    } else if (ev.type === "error") {
      yield { type: "error", message: ev.message };
      return;
    } else if (ev.type === "finish") {
      const call = ev.toolCalls.find(
        (t) => t.name === RENDER_LANDING_PAGE_TOOL.function.name,
      );
      if (call) {
        const parsed = parseRenderArgs(call.args);
        html = parsed.html;
        summary = parsed.summary;
      }
    }
  }

  // Fallback: modelo respondeu em texto livre em vez de chamar a tool.
  if (!html) html = extractHtml(rawContent);
  if (!html) {
    yield { type: "error", message: "A IA não retornou um documento válido." };
    return;
  }

  // Salva o HTML gerado na página.
  await LandingPageRepository.update(pageId, { updatedById: userId, html });

  // Persiste o resumo como mensagem do assistente (não o HTML inteiro — o
  // histórico do chat é conversacional, o HTML vive na página).
  const content = summary || DEFAULT_DONE_MESSAGE;
  const saved = await LandingPageRepository.appendMessage({
    landingPageId: pageId,
    role: "ASSISTANT",
    content,
  });

  const dto: LandingPageMessageDTO = saved.ok
    ? toLandingPageMessageDTO(saved.value)
    : {
        id: "",
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
      };

  yield { type: "done", html, message: dto };
}

export { loadInWorkspace, slugify };
