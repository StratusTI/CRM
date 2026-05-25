import type { Result } from "@/src/lib/result";
import type { SocialPlatform } from "@/src/schemas/social-connection.schema";

/** Tokens normalizados retornados pela troca do authorization code. */
export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

/** Dados mínimos da conta conectada (para exibir e identificar). */
export type SocialAccount = {
  externalId: string;
  name: string | null;
  /**
   * Alguns provedores trocam o token do usuário por um token de sub-conta após
   * descobrir a conta (ex.: Facebook Page token via `/me/accounts`). Quando
   * presente, este token substitui o de `exchangeCode` no que é persistido — é
   * com ele que se posta e se lê insights. `null`/ausente = usa o token original.
   */
  accessTokenOverride?: {
    accessToken: string;
    expiresAt: Date | null;
  } | null;
};

/**
 * Contrato de um provedor OAuth. Cada plataforma implementa as 4 etapas do
 * authorization-code flow. Falhas de rede/HTTP devem virar `socialOauthFailed`.
 */
export type SocialProvider = {
  platform: SocialPlatform;
  /** Credenciais presentes no env? Gateia o botão "Conectar" no frontend. */
  isConfigured(): boolean;
  buildAuthorizeUrl(args: { redirectUri: string; state: string }): string;
  exchangeCode(args: {
    code: string;
    redirectUri: string;
  }): Promise<Result<TokenSet>>;
  fetchAccount(tokens: TokenSet): Promise<Result<SocialAccount>>;
  /**
   * Troca o refresh token por um novo access token. Opcional: nem todo provedor
   * emite refresh token (ex.: Instagram/Facebook usam long-lived tokens). Quando
   * ausente, o token expirado simplesmente exige reconexão.
   */
  refreshAccessToken?(refreshToken: string): Promise<Result<TokenSet>>;
};
