import type { SocialConnection } from "@prisma/client";
import { BETTER_AUTH_URL } from "@/lib/env/_server";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

import { socialScopeMissing } from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import { putBlob, removeBlob } from "@/src/lib/social/blob-store";
import {
  fetchInsights,
  fetchProfile,
  fetchRecentMedia,
  publishPost,
} from "@/src/lib/social/instagram/client";
import {
  IG_INSIGHTS_RANGE_DAYS,
  type InstagramInsights,
  type InstagramInsightsRange,
  type InstagramMediaList,
  type InstagramProfileOverview,
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
   * Publica imagem + legenda no feed. O Graph IG não aceita upload direto —
   * exige `image_url` público. Aqui hospedamos os bytes no [[blob-store]],
   * geramos uma URL pública sob `${BETTER_AUTH_URL}${BASE_PATH}/api/social/blob/<token>`
   * e a passamos ao client; após o publish, o blob é removido.
   */
  async publishPost(
    userId: string,
    slug: string,
    input: PublishInstagramPostInput,
    image: { bytes: ArrayBuffer; contentType: string },
  ): Promise<Result<PublishInstagramPostResult>> {
    const fresh = await getFreshAccessToken(userId, slug, "INSTAGRAM");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.publish)) {
      return err(socialScopeMissing());
    }

    const token = putBlob(image.bytes, image.contentType);
    const imageUrl = `${BETTER_AUTH_URL}${BASE_PATH}/api/social/blob/${token}`;
    try {
      return await publishPost(
        fresh.value.accessToken,
        fresh.value.connection.externalAccountId,
        { caption: input.caption, imageUrl },
      );
    } finally {
      removeBlob(token);
    }
  },
};
