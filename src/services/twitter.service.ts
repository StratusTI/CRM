import type { SocialConnection } from "@prisma/client";
import { socialScopeMissing } from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchProfileOverview,
  publishTweet,
} from "@/src/lib/social/twitter/client";
import type {
  PublishTweetInput,
  PublishTweetResult,
  TwitterProfileOverview,
} from "@/src/schemas/twitter.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

/** Escopos exigidos por capacidade — detecta conexões antigas (sem reconsentir). */
const REQUIRED_SCOPES = {
  overview: "users.read",
  publish: "tweet.write",
} as const;

/** A conexão concedeu o escopo pedido? (scope é lista separada por espaço). */
function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

export const TwitterService = {
  /** Visão do perfil: identidade (sem métricas — paywall no tier gratuito). */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<TwitterProfileOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "TWITTER");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.overview)) {
      return err(socialScopeMissing());
    }
    return fetchProfileOverview(fresh.value.accessToken);
  },

  /** Publica um tweet (texto + imagem opcional). */
  async publishTweet(
    userId: string,
    slug: string,
    input: PublishTweetInput,
    image: { bytes: ArrayBuffer; contentType: string } | null,
  ): Promise<Result<PublishTweetResult>> {
    const fresh = await getFreshAccessToken(userId, slug, "TWITTER");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.publish)) {
      return err(socialScopeMissing());
    }
    return publishTweet(fresh.value.accessToken, { text: input.text, image });
  },
};
