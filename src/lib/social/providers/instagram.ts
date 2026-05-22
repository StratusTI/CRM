import {
  INSTAGRAM_CLIENT_ID,
  INSTAGRAM_CLIENT_SECRET,
} from "@/lib/env/_server";
import { ok, type Result } from "@/src/lib/result";
import { getJson, postForm } from "./http";
import type { SocialAccount, SocialProvider, TokenSet } from "./types";

/** Instagram API with Instagram Login (OAuth direto em instagram.com). */
const SCOPE = "instagram_business_basic";

export const instagramProvider: SocialProvider = {
  platform: "INSTAGRAM",

  isConfigured() {
    return Boolean(INSTAGRAM_CLIENT_ID && INSTAGRAM_CLIENT_SECRET);
  },

  buildAuthorizeUrl({ redirectUri, state }) {
    const params = new URLSearchParams({
      client_id: INSTAGRAM_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<Result<TokenSet>> {
    const result = await postForm<{
      access_token: string;
      permissions?: string;
    }>("https://api.instagram.com/oauth/access_token", {
      client_id: INSTAGRAM_CLIENT_ID ?? "",
      client_secret: INSTAGRAM_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    if (!result.ok) return result;

    return ok({
      accessToken: result.value.access_token,
      refreshToken: null,
      expiresAt: null,
      scope: result.value.permissions ?? SCOPE,
    });
  },

  async fetchAccount(tokens): Promise<Result<SocialAccount>> {
    const params = new URLSearchParams({
      fields: "id,username",
      access_token: tokens.accessToken,
    });
    const result = await getJson<{ id: string; username?: string }>(
      `https://graph.instagram.com/me?${params.toString()}`,
    );
    if (!result.ok) return result;
    return ok({
      externalId: result.value.id,
      name: result.value.username ? `@${result.value.username}` : null,
    });
  },
};
