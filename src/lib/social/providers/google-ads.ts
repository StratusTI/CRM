import {
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from "@/lib/env/_server";
import { ok, type Result } from "@/src/lib/result";
import { expiresInToDate, getJson, postForm } from "./http";
import type { SocialAccount, SocialProvider, TokenSet } from "./types";

/**
 * Google Ads via Google OAuth 2.0 + Google Ads API REST v18.
 * Reusa GOOGLE_CLIENT_ID/SECRET; exige GOOGLE_ADS_DEVELOPER_TOKEN separado
 * (obtido no Google Ads API Center — requer aprovação pelo Google).
 * Escopo: https://www.googleapis.com/auth/adwords
 * Redirect URI a registrar: .../api/social/callback/google_ads
 */
const SCOPE = "https://www.googleapis.com/auth/adwords";

export const googleAdsProvider: SocialProvider = {
  platform: "GOOGLE_ADS",

  isConfigured() {
    return Boolean(
      GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_ADS_DEVELOPER_TOKEN,
    );
  },

  buildAuthorizeUrl({ redirectUri, state }) {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<Result<TokenSet>> {
    const result = await postForm<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    }>("https://oauth2.googleapis.com/token", {
      client_id: GOOGLE_CLIENT_ID ?? "",
      client_secret: GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    if (!result.ok) return result;

    return ok({
      accessToken: result.value.access_token,
      refreshToken: result.value.refresh_token ?? null,
      expiresAt: expiresInToDate(result.value.expires_in),
      scope: result.value.scope ?? SCOPE,
    });
  },

  async fetchAccount(tokens): Promise<Result<SocialAccount>> {
    // Lista as contas do Google Ads acessíveis pelo token — pega a primeira.
    const result = await getJson<{
      resourceNames?: string[]; // "customers/<id>"
    }>(
      "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
      tokens.accessToken,
      { "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN ?? "" },
    );
    if (!result.ok) return result;

    const firstResource = result.value.resourceNames?.[0];
    const customerId = firstResource?.replace("customers/", "") ?? "unknown";

    // Busca o nome descritivo da conta.
    if (customerId === "unknown") {
      return ok({ externalId: "unknown", name: null });
    }

    const infoResult = await getJson<{
      results?: {
        customer?: { id?: string; descriptiveName?: string; currencyCode?: string };
      }[];
    }>(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search?query=SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`,
      tokens.accessToken,
      { "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN ?? "" },
    );

    if (!infoResult.ok) {
      return ok({ externalId: customerId, name: null });
    }

    const customer = infoResult.value.results?.[0]?.customer;
    return ok({
      externalId: customerId,
      name: customer?.descriptiveName ?? null,
    });
  },

  async refreshAccessToken(refreshToken): Promise<Result<TokenSet>> {
    const result = await postForm<{
      access_token: string;
      expires_in?: number;
      scope?: string;
      refresh_token?: string;
    }>("https://oauth2.googleapis.com/token", {
      client_id: GOOGLE_CLIENT_ID ?? "",
      client_secret: GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    if (!result.ok) return result;

    return ok({
      accessToken: result.value.access_token,
      refreshToken: result.value.refresh_token ?? null,
      expiresAt: expiresInToDate(result.value.expires_in),
      scope: result.value.scope ?? null,
    });
  },
};
