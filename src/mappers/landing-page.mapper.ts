import type { LandingPage, LandingPageMessage } from "@prisma/client";
import type {
  LandingPageMetricsRaw,
  LandingPageWithCount,
  WorkspaceLandingView,
} from "@/src/repositories/landing-page.repository";
import type {
  LandingPageDTO,
  LandingPageMessageDTO,
  LandingPageMetricsDTO,
  PublicLandingPageDTO,
} from "@/src/schemas/landing-page.schema";

/** `Prisma.LandingPage` → `LandingPageDTO` (datas em ISO). */
export function toLandingPageDTO(page: LandingPage): LandingPageDTO {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    html: page.html,
    status: page.status,
    publishedAt:
      page.publishedAt === null ? null : page.publishedAt.toISOString(),
    workspaceId: page.workspaceId,
    createdById: page.createdById,
    updatedById: page.updatedById,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    deletedAt: page.deletedAt === null ? null : page.deletedAt.toISOString(),
  };
}

/** Inclui `viewsCount` (do `_count`) — usado nas listagens. */
export function toLandingPageListItemDTO(
  page: LandingPageWithCount,
): LandingPageDTO {
  return { ...toLandingPageDTO(page), viewsCount: page._count.views };
}

/** Só o necessário para a página pública (sem campos internos). */
export function toPublicLandingPageDTO(
  page: LandingPage,
): PublicLandingPageDTO {
  return { id: page.id, title: page.title, html: page.html };
}

/**
 * Linha plana de visita para os dashboards (1 por acesso), com o título da
 * página desnormalizado. `createdAt` em ISO permite bucketizar por dia.
 */
export type LandingPageViewRow = {
  id: string;
  page: string;
  ctaClicks: number;
  durationMs: number;
  referrer: string | null;
  createdAt: string;
};

export function toLandingPageViewRow(
  view: WorkspaceLandingView,
): LandingPageViewRow {
  return {
    id: view.id,
    page: view.landingPage.title,
    ctaClicks: view.ctaClicks,
    durationMs: view.durationMs,
    referrer: view.referrer,
    createdAt: view.createdAt.toISOString(),
  };
}

/** Agregados crus → DTO de métricas. */
export function toLandingPageMetricsDTO(
  raw: LandingPageMetricsRaw,
): LandingPageMetricsDTO {
  return {
    totalViews: raw.totalViews,
    avgDurationMs: raw.avgDurationMs,
    totalCtaClicks: raw.totalCtaClicks,
    referrers: raw.referrers,
  };
}

/** `Prisma.LandingPageMessage` → DTO (role em minúsculo). */
export function toLandingPageMessageDTO(
  message: LandingPageMessage,
): LandingPageMessageDTO {
  return {
    id: message.id,
    role: message.role === "ASSISTANT" ? "assistant" : "user",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
