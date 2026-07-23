import type { SocialConnection } from "@prisma/client";
import { BETTER_AUTH_URL } from "@/lib/env/_server";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

import { socialScopeMissing } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { putBlob, removeBlob } from "@/src/lib/social/blob-store";
import {
  fetchInsights,
  fetchMediaSaved,
  fetchProfile,
  fetchRecentMedia,
  publishPost,
} from "@/src/lib/social/instagram/client";
import {
  IG_INSIGHTS_RANGE_DAYS,
  type InstagramInsights,
  type InstagramInsightsRange,
  type InstagramMediaEngagement,
  type InstagramMediaList,
  type InstagramProfileOverview,
  type InstagramWeeklyEngagement,
  type PublishInstagramPostInput,
  type PublishInstagramPostResult,
} from "@/src/schemas/instagram.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

/** Escopos exigidos por capacidade — detecta conexões antigas (sem reconsentir). */
const REQUIRED_SCOPES = {
  read: "instagram_basic",
  insights: "instagram_manage_insights",
  publish: "instagram_content_publish",
} as const;

/** Data UTC `YYYY-MM-DD` deslocada por `days` (negativo = no passado). */
function isoDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** A conexão concedeu o escopo pedido? (scope é string separada por vírgula). */
function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

/**
 * Mídias recentes publicadas desde `cutoffMs`, enriquecidas com `saved`
 * (insight por post, best-effort) + `engagementScore`. Base compartilhada por
 * `getWeeklyEngagement` (cutoff = 7d) e pelo ranking "Em Alta" (cutoff = hoje).
 */
async function fetchEnrichedMediaSince(
  accessToken: string,
  igAccountId: string,
  cutoffMs: number,
): Promise<Result<InstagramMediaEngagement[]>> {
  const mediaResult = await fetchRecentMedia(accessToken, igAccountId);
  if (!mediaResult.ok) return mediaResult;

  const recent = mediaResult.value.media.filter((m) => {
    const t = new Date(m.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoffMs;
  });

  const withSaved = await Promise.all(
    recent.map(async (m) => {
      const saved = await fetchMediaSaved(accessToken, m.id);
      return {
        ...m,
        saved,
        engagementScore: m.likeCount + m.commentsCount + saved,
      };
    }),
  );
  return ok(withSaved);
}

export const InstagramService = {
  /** Visão do perfil: identidade + contagens. */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<InstagramProfileOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    return fetchProfile(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
    );
  },

  /** Insights (resumo + série diária) para a janela pedida. */
  async getInsights(
    userId: string,
    slug: string,
    range: InstagramInsightsRange,
  ): Promise<Result<InstagramInsights>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.insights)) {
      return err(socialScopeMissing());
    }
    return fetchInsights(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
      {
        range,
        startDate: isoDate(-IG_INSIGHTS_RANGE_DAYS[range]),
        endDate: isoDate(0),
      },
    );
  },

  /** Mídias recentes do perfil (feed): imagens, vídeos e carrosséis. */
  async getRecentMedia(
    userId: string,
    slug: string,
  ): Promise<Result<InstagramMediaList>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    return fetchRecentMedia(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
    );
  },

  /**
   * Resumo semanal para a aba Analytics: views (impressões 7d), saves (soma
   * do insight `saved` por post publicado nos últimos 7 dias), visitas ao
   * perfil (7d) e o top 5 de posts recentes por engajamento
   * (curtidas + comentários + saves). `saved` é buscado por mídia — chamadas
   * best-effort (falha vira 0, não derruba o restante do cálculo).
   */
  async getWeeklyEngagement(
    userId: string,
    slug: string,
  ): Promise<Result<InstagramWeeklyEngagement>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.insights)) {
      return err(socialScopeMissing());
    }

    const igAccountId = fresh.value.connection.externalAccountId;
    const insights = await fetchInsights(fresh.value.accessToken, igAccountId, {
      range: "7d",
      startDate: isoDate(-IG_INSIGHTS_RANGE_DAYS["7d"]),
      endDate: isoDate(0),
    });
    if (!insights.ok) return insights;

    const cutoff = Date.now() - IG_INSIGHTS_RANGE_DAYS["7d"] * 86_400_000;
    const enriched = await fetchEnrichedMediaSince(
      fresh.value.accessToken,
      igAccountId,
      cutoff,
    );
    if (!enriched.ok) return enriched;

    const saves7d = enriched.value.reduce((sum, m) => sum + m.saved, 0);
    const top5 = [...enriched.value]
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5);

    return ok({
      views7d: insights.value.totals.impressions,
      saves7d,
      profileViews7d: insights.value.totals.profileViews,
      top5,
    });
  },

  /** Mídias postadas hoje (dia calendário), enriquecidas com engajamento — usado pelo ranking "Em Alta". */
  async getTodayMediaEngagement(
    userId: string,
    slug: string,
  ): Promise<Result<InstagramMediaEngagement[]>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.insights)) {
      return err(socialScopeMissing());
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return fetchEnrichedMediaSince(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
      startOfToday.getTime(),
    );
  },

  /**
   * Publica no Instagram conforme o `postType` (feed, reels ou stories). O Graph
   * IG não aceita upload direto — exige uma URL pública (`image_url`/`video_url`).
   * Aqui hospedamos os bytes no [[blob-store]], geramos uma URL pública sob
   * `${BETTER_AUTH_URL}${BASE_PATH}/api/social/blob/<token>` e a passamos ao
   * client; após o publish, o blob é removido. Reels exige vídeo; feed exige
   * imagem; stories aceita os dois.
   */
  async publishPost(
    userId: string,
    slug: string,
    input: PublishInstagramPostInput,
    media: { bytes: ArrayBuffer; contentType: string; kind: "IMAGE" | "VIDEO" },
  ): Promise<Result<PublishInstagramPostResult>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.publish)) {
      return err(socialScopeMissing());
    }

    const token = putBlob(media.bytes, media.contentType);
    const url = `${BETTER_AUTH_URL}${BASE_PATH}/api/social/blob/${token}`;
    try {
      return await publishPost(
        fresh.value.accessToken,
        fresh.value.connection.externalAccountId,
        {
          caption: input.caption,
          postType: input.postType,
          imageUrl: media.kind === "IMAGE" ? url : null,
          videoUrl: media.kind === "VIDEO" ? url : null,
        },
      );
    } finally {
      removeBlob(token);
    }
  },
};
