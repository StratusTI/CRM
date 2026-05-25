import type { SocialConnection } from "@prisma/client";
import { socialScopeMissing } from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchCreatorOverview,
  fetchVideos,
  publishVideo,
} from "@/src/lib/social/tiktok/client";
import type {
  PublishTiktokVideoInput,
  PublishTiktokVideoResult,
  TiktokCreatorOverview,
  TiktokVideos,
} from "@/src/schemas/tiktok.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

/** Escopos exigidos por capacidade — detecta conexões antigas (sem reconsentir). */
const REQUIRED_SCOPES = {
  stats: "user.info.stats",
  videos: "video.list",
  publish: "video.publish",
} as const;

/** A conexão concedeu o escopo pedido? (scope é lista separada por vírgula). */
function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

export const TiktokService = {
  /** Visão do criador: identidade + estatísticas agregadas. */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<TiktokCreatorOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "TIKTOK");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.stats)) {
      return err(socialScopeMissing());
    }
    return fetchCreatorOverview(fresh.value.accessToken);
  },

  /** Vídeos recentes com métricas por vídeo + totais agregados. */
  async getVideos(userId: string, slug: string): Promise<Result<TiktokVideos>> {
    const fresh = await getFreshAccessToken(userId, slug, "TIKTOK");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.videos)) {
      return err(socialScopeMissing());
    }
    return fetchVideos(fresh.value.accessToken);
  },

  /** Publica um vídeo (Direct Post) com legenda e nível de privacidade. */
  async publishVideo(
    userId: string,
    slug: string,
    input: PublishTiktokVideoInput,
    file: { bytes: ArrayBuffer; contentType: string },
  ): Promise<Result<PublishTiktokVideoResult>> {
    const fresh = await getFreshAccessToken(userId, slug, "TIKTOK");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.publish)) {
      return err(socialScopeMissing());
    }
    return publishVideo(fresh.value.accessToken, {
      file,
      title: input.title,
      privacyLevel: input.privacyLevel,
      disableComment: input.disableComment,
      disableDuet: input.disableDuet,
      disableStitch: input.disableStitch,
    });
  },
};
