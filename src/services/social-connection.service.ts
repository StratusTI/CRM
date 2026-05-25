import {
  socialConnectionNotFound,
  socialOauthFailed,
  socialProviderNotConfigured,
  socialStateInvalid,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { encryptToken, isTokenCryptoConfigured } from "@/src/lib/social/crypto";
import {
  createOauthState,
  verifyOauthState,
} from "@/src/lib/social/oauth-state";
import { getProvider } from "@/src/lib/social/providers";
import { socialCallbackUrl } from "@/src/lib/social/redirect";
import { toSocialConnectionDTO } from "@/src/mappers/social-connection.mapper";
import { SocialConnectionRepository } from "@/src/repositories/social-connection.repository";
import type {
  SocialConnectionDTO,
  SocialPlatform,
} from "@/src/schemas/social-connection.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

export const SocialConnectionService = {
  /** Lista as conexões de rede social do workspace (exige membership). */
  async list(
    userId: string,
    slug: string,
  ): Promise<Result<SocialConnectionDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await SocialConnectionRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toSocialConnectionDTO));
  },

  /** Desconecta (remove) a conexão da plataforma. */
  async disconnect(
    userId: string,
    slug: string,
    platform: SocialPlatform,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const removed = await SocialConnectionRepository.deleteByPlatform(
      ws.value,
      platform,
    );
    if (!removed.ok) return removed;
    if (!removed.value) return err(socialConnectionNotFound());
    return ok(true);
  },

  /**
   * Inicia o fluxo OAuth: valida membership + configuração e devolve a URL de
   * autorização do provedor (com `state` assinado carregando workspace/plataforma).
   */
  async beginConnect(
    userId: string,
    slug: string,
    platform: SocialPlatform,
  ): Promise<Result<{ authorizeUrl: string }>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const provider = getProvider(platform);
    if (!provider.isConfigured() || !isTokenCryptoConfigured()) {
      return err(socialProviderNotConfigured());
    }

    const authorizeUrl = provider.buildAuthorizeUrl({
      redirectUri: socialCallbackUrl(platform),
      state: createOauthState(slug, platform),
    });
    return ok({ authorizeUrl });
  },

  /**
   * Conclui o fluxo OAuth: verifica o `state`, troca o code por tokens, busca a
   * conta, cifra as credenciais e faz upsert. Retorna o slug para redirecionar.
   */
  async completeConnect(
    userId: string,
    args: { platform: SocialPlatform; code: string; state: string },
  ): Promise<Result<{ slug: string }>> {
    const verified = verifyOauthState(args.state);
    if (!verified.ok) return err(socialStateInvalid());

    const { slug, platform } = verified.value;
    // A plataforma do callback deve bater com a assinada no state.
    if (platform !== args.platform) return err(socialStateInvalid());

    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const provider = getProvider(platform);
    if (!provider.isConfigured() || !isTokenCryptoConfigured()) {
      return err(socialProviderNotConfigured());
    }

    const tokens = await provider.exchangeCode({
      code: args.code,
      redirectUri: socialCallbackUrl(platform),
    });
    if (!tokens.ok) return tokens;

    const account = await provider.fetchAccount(tokens.value);
    if (!account.ok) return account;

    // Provedores como o Facebook trocam o token do usuário por um token de
    // sub-conta (Page token) — é esse que persistimos quando presente.
    const override = account.value.accessTokenOverride ?? null;
    const effectiveAccessToken =
      override?.accessToken ?? tokens.value.accessToken;
    const effectiveExpiresAt = override
      ? override.expiresAt
      : tokens.value.expiresAt;

    let accessToken: string;
    let refreshToken: string | null;
    try {
      accessToken = encryptToken(effectiveAccessToken);
      refreshToken = tokens.value.refreshToken
        ? encryptToken(tokens.value.refreshToken)
        : null;
    } catch {
      return err(socialOauthFailed("Falha ao cifrar os tokens"));
    }

    const saved = await SocialConnectionRepository.upsertByPlatform({
      workspaceId: ws.value,
      platform,
      createdById: userId,
      externalAccountId: account.value.externalId,
      accountName: account.value.name,
      accessToken,
      refreshToken,
      tokenExpiresAt: effectiveExpiresAt,
      scope: tokens.value.scope,
    });
    if (!saved.ok) return saved;

    return ok({ slug });
  },
};
