import type { SocialConnection } from "@prisma/client";
import {
  socialConnectionNotFound,
  socialOauthFailed,
  socialScopeMissing,
  socialTokenExpired,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import {
  decryptToken,
  encryptToken,
  isTokenCryptoConfigured,
} from "@/src/lib/social/crypto";
import { getProvider } from "@/src/lib/social/providers";
import {
  fetchChannelOverview,
  fetchInsights,
  uploadVideo,
} from "@/src/lib/social/youtube/client";
import { SocialConnectionRepository } from "@/src/repositories/social-connection.repository";
import {
  INSIGHTS_RANGE_DAYS,
  type PublishVideoInput,
  type PublishVideoResult,
  type YoutubeChannelOverview,
  type YoutubeInsights,
  type YoutubeInsightsRange,
} from "@/src/schemas/youtube.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Margem para considerar o token "perto de expirar" e renovar proativamente. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

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

/**
 * Carrega a conexão YouTube do workspace e devolve um access token válido,
 * renovando-o (e persistindo) quando expirado. Falha com:
 * - `socialConnectionNotFound` se a conta não está conectada;
 * - `socialTokenExpired` se não há como renovar (sem refresh token / refresh falhou).
 */
async function getFreshAccessToken(
  userId: string,
  slug: string,
): Promise<Result<{ accessToken: string; connection: SocialConnection }>> {
  const ws = await resolveWorkspaceId(userId, slug);
  if (!ws.ok) return ws;

  if (!isTokenCryptoConfigured()) {
    return err(socialOauthFailed("Cifragem de tokens não configurada"));
  }

  const found = await SocialConnectionRepository.findByWorkspaceAndPlatform(
    ws.value,
    "YOUTUBE",
  );
  if (!found.ok) return found;
  if (!found.value) return err(socialConnectionNotFound());

  const connection = found.value;
  const notExpired =
    !connection.tokenExpiresAt ||
    connection.tokenExpiresAt.getTime() - TOKEN_EXPIRY_MARGIN_MS > Date.now();

  if (notExpired) {
    try {
      return ok({
        accessToken: decryptToken(connection.accessToken),
        connection,
      });
    } catch {
      return err(socialOauthFailed("Falha ao decifrar o token"));
    }
  }

  // Token expirado: tenta renovar com o refresh token.
  if (!connection.refreshToken) return err(socialTokenExpired());

  const provider = getProvider("YOUTUBE");
  if (!provider.refreshAccessToken) return err(socialTokenExpired());

  let refreshTokenPlain: string;
  try {
    refreshTokenPlain = decryptToken(connection.refreshToken);
  } catch {
    return err(socialOauthFailed("Falha ao decifrar o refresh token"));
  }

  const refreshed = await provider.refreshAccessToken(refreshTokenPlain);
  if (!refreshed.ok) {
    // Refresh recusado normalmente significa consentimento revogado.
    await SocialConnectionRepository.updateStatus(connection.id, "EXPIRED");
    return err(socialTokenExpired());
  }

  let encryptedAccess: string;
  let encryptedRefresh: string | null = null;
  try {
    encryptedAccess = encryptToken(refreshed.value.accessToken);
    if (refreshed.value.refreshToken) {
      encryptedRefresh = encryptToken(refreshed.value.refreshToken);
    }
  } catch {
    return err(socialOauthFailed("Falha ao cifrar o token renovado"));
  }

  const saved = await SocialConnectionRepository.updateTokens(connection.id, {
    accessToken: encryptedAccess,
    refreshToken: encryptedRefresh,
    tokenExpiresAt: refreshed.value.expiresAt,
    scope: refreshed.value.scope,
  });
  if (!saved.ok) return saved;

  return ok({
    accessToken: refreshed.value.accessToken,
    connection: saved.value,
  });
}

export const YoutubeService = {
  /** Visão da conta: identidade do canal + métricas agregadas. */
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<YoutubeChannelOverview>> {
    const fresh = await getFreshAccessToken(userId, slug);
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
    const fresh = await getFreshAccessToken(userId, slug);
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

  /** Publica (faz upload) de um vídeo no canal conectado. */
  async publishVideo(
    userId: string,
    slug: string,
    input: PublishVideoInput,
    file: { bytes: ArrayBuffer; contentType: string },
  ): Promise<Result<PublishVideoResult>> {
    const fresh = await getFreshAccessToken(userId, slug);
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
