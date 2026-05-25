import type { SocialConnection } from "@prisma/client";
import { socialScopeMissing } from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchInsights,
  fetchPageOverview,
  publishPost,
} from "@/src/lib/social/facebook/client";
import {
  type FacebookInsights,
  type FacebookInsightsRange,
  type FacebookPageOverview,
  FB_INSIGHTS_RANGE_DAYS,
  type PublishPostInput,
  type PublishPostResult,
} from "@/src/schemas/facebook.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

/** Escopos exigidos por capacidade — detecta conexões antigas (sem reconsentir). */
const REQUIRED_SCOPES = {
  read: "pages_read_engagement",
  insights: "read_insights",
  publish: "pages_manage_posts",
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

export const FacebookService = {
  /** Visão da Página: identidade + contagens. */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<FacebookPageOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "FACEBOOK");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    return fetchPageOverview(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
    );
  },

  /** Insights (resumo + série diária) para a janela pedida. */
  async getInsights(
    userId: string,
    slug: string,
    range: FacebookInsightsRange,
  ): Promise<Result<FacebookInsights>> {
    const fresh = await getFreshAccessToken(userId, slug, "FACEBOOK");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.insights)) {
      return err(socialScopeMissing());
    }
    return fetchInsights(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
      {
        range,
        startDate: isoDate(-FB_INSIGHTS_RANGE_DAYS[range]),
        endDate: isoDate(0),
      },
    );
  },

  /** Publica um post (texto/link, ou imagem com legenda) na Página. */
  async publishPost(
    userId: string,
    slug: string,
    input: PublishPostInput,
    image: { bytes: ArrayBuffer; contentType: string } | null,
  ): Promise<Result<PublishPostResult>> {
    const fresh = await getFreshAccessToken(userId, slug, "FACEBOOK");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.publish)) {
      return err(socialScopeMissing());
    }
    return publishPost(
      fresh.value.accessToken,
      fresh.value.connection.externalAccountId,
      { message: input.message, link: input.link, image },
    );
  },
};
