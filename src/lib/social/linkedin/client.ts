import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  LinkedInOverview,
  LinkedInPublishOutput,
} from "@/src/schemas/linkedin.schema";

const BASE = "https://api.linkedin.com";
const REST = `${BASE}/rest`;

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

/**
 * O campo `commentary` da Posts API usa o "Little text format": alguns caracteres
 * são reservados e precisam ser escapados com `\`. Sem isso, o texto cru pode ser
 * rejeitado ou renderizado errado. A barra invertida vem no conjunto para escapar
 * barras já presentes no texto.
 */
function escapeCommentary(text: string): string {
  return text.replace(/([\\|{}()[\]<>@~_*#])/g, "\\$1");
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
 * Sobe uma imagem via Images API e devolve o URN (`urn:li:image:…`) pronto para
 * anexar a um post. Fluxo em dois passos: `initializeUpload` reserva a URL e o URN;
 * em seguida a imagem é enviada por `PUT` (binário cru) para a URL recebida.
 * `ownerUrn` é o URN do membro: `urn:li:person:{sub}`.
 */
async function uploadImage(
  accessToken: string,
  ownerUrn: string,
  image: { bytes: ArrayBuffer; contentType: string },
): Promise<Result<string>> {
  const init = await fetch(`${REST}/images?action=initializeUpload`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  }).catch((e) => {
    console.error("[linkedin] initializeUpload erro de rede", e);
    return null;
  });

  if (!init) return err(socialOauthFailed());
  if (!init.ok) {
    await logFailure("initializeUpload", init);
    return err(socialOauthFailed());
  }

  const data = (await init.json().catch(() => ({}))) as {
    value?: { uploadUrl?: string; image?: string };
  };
  const uploadUrl = data.value?.uploadUrl;
  const imageUrn = data.value?.image;
  if (!uploadUrl || !imageUrn) {
    console.error("[linkedin] initializeUpload sem uploadUrl/image");
    return err(socialOauthFailed());
  }

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": image.contentType || "application/octet-stream",
    },
    body: image.bytes,
  }).catch((e) => {
    console.error("[linkedin] upload da imagem erro de rede", e);
    return null;
  });

  if (!upload) return err(socialOauthFailed());
  if (!upload.ok) {
    await logFailure("upload da imagem", upload);
    return err(socialOauthFailed());
  }

  return ok(imageUrn);
}

/**
 * Publica um post via Posts API (w_member_social), com imagem opcional.
 * `authorUrn` é o URN do membro: `urn:li:person:{sub}`.
 */
export async function publishPost(
  accessToken: string,
  authorUrn: string,
  text: string,
  image?: { bytes: ArrayBuffer; contentType: string } | null,
): Promise<Result<LinkedInPublishOutput>> {
  let imageUrn: string | null = null;
  if (image) {
    const uploaded = await uploadImage(accessToken, authorUrn, image);
    if (!uploaded.ok) return uploaded;
    imageUrn = uploaded.value;
  }

  const body = JSON.stringify({
    author: authorUrn,
    commentary: escapeCommentary(text),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
    ...(imageUrn ? { content: { media: { id: imageUrn, altText: "" } } } : {}),
  });

  const response = await fetch(`${REST}/posts`, {
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

  // O LinkedIn retorna o URN do post no header `x-restli-id`.
  const postUrn =
    response.headers.get("x-restli-id") ??
    response.headers.get("X-RestLi-Id") ??
    "unknown";

  return ok({ postUrn });
}
