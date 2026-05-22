import { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET } from "@/lib/env/_server";
import { ok, type Result } from "@/src/lib/result";
import { expiresInToDate, getJson, postForm } from "./http";
import type { SocialAccount, SocialProvider, TokenSet } from "./types";

/** TikTok Login Kit v2. */
const SCOPE = "user.info.basic";

export const tiktokProvider: SocialProvider = {
  platform: "TIKTOK",

  isConfigured() {
    return Boolean(TIKTOK_CLIENT_KEY && TIKTOK_CLIENT_SECRET);
  },

  buildAuthorizeUrl({ redirectUri, state }) {
    const params = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY ?? "",
      scope: SCOPE,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<Result<TokenSet>> {
    const result = await postForm<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    }>("https://open.tiktokapis.com/v2/oauth/token/", {
      client_key: TIKTOK_CLIENT_KEY ?? "",
      client_secret: TIKTOK_CLIENT_SECRET ?? "",
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
    const result = await getJson<{
      data?: { user?: { open_id?: string; display_name?: string } };
    }>(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      tokens.accessToken,
    );
    if (!result.ok) return result;
    const user = result.value.data?.user;
    return ok({
      externalId: user?.open_id ?? "unknown",
      name: user?.display_name ?? null,
    });
  },
};
