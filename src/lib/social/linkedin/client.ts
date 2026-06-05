import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  LinkedInOverview,
  LinkedInPublishOutput,
} from "@/src/schemas/linkedin.schema";

const BASE = "https://api.linkedin.com";

async function logFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(
    `[linkedin] ${label} falhou`,
    response.status,
    body.slice(0, 500),
  );
}

/** Cabeçalhos padrão para a LinkedIn API (versão mais recente compatível com free). */
function headers(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": "202404",
    "X-RestLi-Protocol-Version": "2.0.0",
  };
}

/** Perfil do membro autenticado via OpenID Connect userinfo. */
export async function fetchProfile(
  accessToken: string,
): Promise<Result<LinkedInOverview>> {
  const response = await fetch(`${BASE}/v2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  }).catch((e) => {
    console.error("[linkedin] fetchProfile erro de rede", e);
    return null;
  });

  if (!response) return err(socialOauthFailed());
  if (!response.ok) {
    await logFailure("fetchProfile", response);
    return err(socialOauthFailed());
  }

  const data = (await response.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
    locale?: string;
  };

  return ok({
    personId: data.sub ?? "unknown",
    name: data.name ?? null,
    headline: null,
    email: data.email ?? null,
    picture: data.picture ?? null,
  });
}

/**
 * Publica um post de texto simples via UGC Posts (w_member_social).
 * `authorUrn` é o URN do membro: `urn:li:person:{sub}`.
 */
export async function publishPost(
  accessToken: string,
  authorUrn: string,
  text: string,
): Promise<Result<LinkedInPublishOutput>> {
  const body = JSON.stringify({
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  });

  const response = await fetch(`${BASE}/v2/ugcPosts`, {
    method: "POST",
    headers: headers(accessToken),
    body,
  }).catch((e) => {
    console.error("[linkedin] publishPost erro de rede", e);
    return null;
  });

  if (!response) return err(socialOauthFailed());
  if (!response.ok) {
    await logFailure("publishPost", response);
    return err(socialOauthFailed());
  }

  // O LinkedIn retorna o URN do post no header `X-RestLi-Id` ou no body.
  const postUrn =
    response.headers.get("X-RestLi-Id") ??
    response.headers.get("x-restli-id") ??
    "unknown";

  return ok({ postUrn });
}
