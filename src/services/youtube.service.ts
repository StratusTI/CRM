import type { SocialConnection } from "@prisma/client";
import { socialScopeMissing } from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchChannelOverview,
  fetchInsights,
  fetchRecentVideos,
  uploadVideo,
} from "@/src/lib/social/youtube/client";
import {
  INSIGHTS_RANGE_DAYS,
  type PublishVideoInput,
  type PublishVideoResult,
  type YoutubeChannelOverview,
  type YoutubeInsights,
  type YoutubeInsightsRange,
  type YoutubeVideos,
} from "@/src/schemas/youtube.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

/** Escopos exigidos por capacidade — usados para detectar conexões antigas. */
const REQUIRED_SCOPES = {
  read: "youtube.readonly",
  analytics: "yt-analytics.readonly",
  upload: "youtube.upload",
} as const;

/** Data UTC `YYYY-MM-DD` deslocada por `days` (negativo = no passado). */
function isoDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** A conexão concedeu o escopo pedido? (scope é string separada por espaços). */
function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

export const YoutubeService = {
  /** Visão da conta: identidade do canal + métricas agregadas. */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<YoutubeChannelOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "YOUTUBE");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    return fetchChannelOverview(fresh.value.accessToken);
  },

  /** Analytics (resumo + série diária) para a janela pedida. */
  async getInsights(
    userId: string,
    slug: string,
    range: YoutubeInsightsRange,
  ): Promise<Result<YoutubeInsights>> {
    const fresh = await getFreshAccessToken(userId, slug, "YOUTUBE");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.analytics)) {
      return err(socialScopeMissing());
    }
    // Analytics tem ~2-3 dias de atraso; pedimos até ontem para evitar buracos.
    return fetchInsights(fresh.value.accessToken, {
      range,
      startDate: isoDate(-INSIGHTS_RANGE_DAYS[range]),
      endDate: isoDate(-1),
    });
  },

  /** Vídeos recentes do canal (playlist de uploads). */
  async getRecentVideos(
    userId: string,
    slug: string,
  ): Promise<Result<YoutubeVideos>> {
    const fresh = await getFreshAccessToken(userId, slug, "YOUTUBE");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    return fetchRecentVideos(fresh.value.accessToken);
  },

  /** Publica (faz upload) de um vídeo no canal conectado. */
  async publishVideo(
    userId: string,
    slug: string,
    input: PublishVideoInput,
    file: { bytes: ArrayBuffer; contentType: string },
  ): Promise<Result<PublishVideoResult>> {
    const fresh = await getFreshAccessToken(userId, slug, "YOUTUBE");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.upload)) {
      return err(socialScopeMissing());
    }
    return uploadVideo(fresh.value.accessToken, {
      file,
      title: input.title,
      description: input.description,
      tags: input.tags,
      privacyStatus: input.privacyStatus,
    });
  },
};
