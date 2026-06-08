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
    const devToken = GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
    const bearer = `Bearer ${tokens.accessToken}`;
    const base = "https://googleads.googleapis.com/v20";

    // Lista todas as contas acessíveis pelo token.
    const listResult = await getJson<{ resourceNames?: string[] }>(
      `${base}/customers:listAccessibleCustomers`,
      tokens.accessToken,
      { "developer-token": devToken },
    );
    if (!listResult.ok) return listResult;

    const firstResource = listResult.value.resourceNames?.[0];
    const rootId = firstResource?.replace("customers/", "") ?? "unknown";
    if (rootId === "unknown") return ok({ externalId: "unknown", name: null });

    // Verifica se a conta raiz é uma Manager Account (MCC).
    type CustomerRow = {
      results?: { customer?: { id?: string; descriptiveName?: string; manager?: boolean } }[];
    };
    const infoRes = await fetch(`${base}/customers/${rootId}/googleAds:search`, {
      method: "POST",
      headers: { Authorization: bearer, "developer-token": devToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1" }),
    }).catch(() => null);

    const infoBody = infoRes?.ok ? await infoRes.json().catch(() => ({})) : {};
    console.log("[google-ads/fetchAccount] infoRes status:", infoRes?.status, JSON.stringify(infoBody).slice(0, 400));
    const infoData: CustomerRow = infoBody;
    const rootCustomer = infoData.results?.[0]?.customer;
    const isManager = rootCustomer?.manager === true;

    console.log("[google-ads/fetchAccount] rootId:", rootId, "isManager:", isManager, "name:", rootCustomer?.descriptiveName);

    if (!isManager) {
      return ok({ externalId: rootId, name: rootCustomer?.descriptiveName ?? null });
    }

    // Manager Account: busca a primeira sub-conta não-gerente.
    // Armazena como "managerId|subAccountId" para o client usar login-customer-id.
    type ClientRow = {
      results?: { customerClient?: { id?: string; descriptiveName?: string } }[];
    };
    const clientsRes = await fetch(`${base}/customers/${rootId}/googleAds:search`, {
      method: "POST",
      headers: {
        Authorization: bearer,
        "developer-token": devToken,
        "login-customer-id": rootId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager FROM customer_client WHERE customer_client.manager = FALSE ORDER BY customer_client.level ASC LIMIT 5",
      }),
    }).catch(() => null);

    const clientsBody = clientsRes?.ok ? await clientsRes.json().catch(() => ({})) : {};
    console.log("[google-ads/fetchAccount] clientsRes status:", clientsRes?.status, JSON.stringify(clientsBody).slice(0, 600));
    const clientsData: ClientRow = clientsBody;
    const firstClient = clientsData.results?.[0]?.customerClient;

    if (!firstClient?.id) {
      // Sem sub-contas acessíveis — conexão inútil para métricas.
      console.log("[google-ads/fetchAccount] nenhuma sub-conta encontrada para manager", rootId);
      return ok({ externalId: "unknown", name: rootCustomer?.descriptiveName ?? null });
    }

    return ok({
      externalId: `${rootId}|${firstClient.id}`,
      name: firstClient.descriptiveName ?? rootCustomer?.descriptiveName ?? null,
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
