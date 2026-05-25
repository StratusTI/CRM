import type { SocialConnection } from "@prisma/client";
import {
  socialConnectionNotFound,
  socialOauthFailed,
  socialTokenExpired,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import {
  decryptToken,
  encryptToken,
  isTokenCryptoConfigured,
} from "@/src/lib/social/crypto";
import { getProvider } from "@/src/lib/social/providers";
import { SocialConnectionRepository } from "@/src/repositories/social-connection.repository";
import type { SocialPlatform } from "@/src/schemas/social-connection.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Margem para considerar o token "perto de expirar" e renovar proativamente. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/**
 * Carrega a conexão da plataforma no workspace e devolve um access token válido,
 * renovando-o (e persistindo) quando expirado e o provedor suportar refresh.
 * Compartilhado entre os serviços por-plataforma (YouTube, Facebook, …). Falha:
 * - `socialConnectionNotFound` se a conta não está conectada;
 * - `socialTokenExpired` se expirou e não há como renovar (sem refresh / falhou).
 *
 * Provedores sem refresh token (ex.: Facebook usa Page token longo) caem no
 * `socialTokenExpired` quando o token expira — o que sinaliza reconexão na UI.
 */
export async function getFreshAccessToken(
  userId: string,
  slug: string,
  platform: SocialPlatform,
): Promise<Result<{ accessToken: string; connection: SocialConnection }>> {
  const ws = await resolveWorkspaceId(userId, slug);
  if (!ws.ok) return ws;

  if (!isTokenCryptoConfigured()) {
    return err(socialOauthFailed("Cifragem de tokens não configurada"));
  }

  const found = await SocialConnectionRepository.findByWorkspaceAndPlatform(
    ws.value,
    platform,
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

  // Token expirado: tenta renovar com o refresh token (se o provedor suportar).
  if (!connection.refreshToken) return err(socialTokenExpired());

  const provider = getProvider(platform);
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
