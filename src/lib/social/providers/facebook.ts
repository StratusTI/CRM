import { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET } from "@/lib/env/_server";
import { ok, type Result } from "@/src/lib/result";
import { expiresInToDate, getJson } from "./http";
import type { SocialAccount, SocialProvider, TokenSet } from "./types";

/** Facebook Login (Graph API). */
const GRAPH = "https://graph.facebook.com/v21.0";
const SCOPE = "public_profile";

export const facebookProvider: SocialProvider = {
  platform: "FACEBOOK",

  isConfigured() {
    return Boolean(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET);
  },

  buildAuthorizeUrl({ redirectUri, state }) {
    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<Result<TokenSet>> {
    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID ?? "",
      client_secret: FACEBOOK_APP_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const result = await getJson<{
      access_token: string;
      expires_in?: number;
    }>(`${GRAPH}/oauth/access_token?${params.toString()}`);
    if (!result.ok) return result;

    return ok({
      accessToken: result.value.access_token,
      refreshToken: null,
      expiresAt: expiresInToDate(result.value.expires_in),
      scope: SCOPE,
    });
  },

  async fetchAccount(tokens): Promise<Result<SocialAccount>> {
    const params = new URLSearchParams({
      fields: "id,name",
      access_token: tokens.accessToken,
    });
    const result = await getJson<{ id: string; name?: string }>(
      `${GRAPH}/me?${params.toString()}`,
    );
    if (!result.ok) return result;
    return ok({ externalId: result.value.id, name: result.value.name ?? null });
  },
};
