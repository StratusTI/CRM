import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  PublishTweetResult,
  TwitterProfileOverview,
} from "@/src/schemas/twitter.schema";

/**
 * Cliente HTTP da API do X/Twitter v2, sobre um access token já fresco (o service
 * garante o frescor antes de chamar aqui). Lê o perfil (`/2/users/me`) e publica
 * tweets (`/2/tweets`), com upload opcional de imagem via `/2/media/upload`. Cada
 * função traduz a resposta crua para os DTOs do contrato e converte falhas em
 * `socialOauthFailed`, preservando o corpo do erro no log (padrão dos demais
 * clients). O upload de mídia é best-effort: se o tier do app não o liberar, a
 * publicação só-texto continua funcionando.
 */
const API = "https://api.twitter.com/2";
const UPLOAD_API = "https://api.x.com/2/media/upload";

async function logFailure(label: string, response: Response): Promise<void> {
  console.error(
    `[twitter] ${label} falhou`,
    response.status,
    (await response.text().catch(() => "")).slice(0, 500),
  );
}

/** Visão do perfil: identidade (sem métricas — paywall no tier gratuito). */
export async function fetchProfileOverview(
  accessToken: string,
): Promise<Result<TwitterProfileOverview>> {
  const fields = ["profile_image_url", "username", "name"].join(",");

  try {
    const response = await fetch(`${API}/users/me?user.fields=${fields}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      await logFailure("users/me", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json().catch(() => ({}))) as {
      data?: {
        id?: string;
        username?: string;
        name?: string;
        profile_image_url?: string;
      };
    };
    const user = json.data ?? {};
    return ok({
      id: user.id ?? "unknown",
      username: user.username ?? "",
      name: user.name || null,
      profileImageUrl: user.profile_image_url || null,
    });
  } catch (error) {
    console.error("[twitter] users/me erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Upload de imagem → `media_id`, usado depois em `media.media_ids` do tweet. */
async function uploadMedia(
  accessToken: string,
  image: { bytes: ArrayBuffer; contentType: string },
): Promise<Result<string>> {
  try {
    const form = new FormData();
    form.append(
      "media",
      new Blob([image.bytes], { type: image.contentType || "image/jpeg" }),
    );
    form.append("media_category", "tweet_image");

    const response = await fetch(UPLOAD_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    if (!response.ok) {
      await logFailure("media/upload", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json().catch(() => ({}))) as {
      data?: { id?: string; media_key?: string };
      media_id_string?: string;
    };
    const mediaId = json.data?.id ?? json.media_id_string;
    if (!mediaId) {
      console.error("[twitter] media/upload sem media id");
      return err(socialOauthFailed());
    }
    return ok(mediaId);
  } catch (error) {
    console.error("[twitter] media/upload erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Publica um tweet (texto + imagem opcional). Devolve id e link do tweet. */
export async function publishTweet(
  accessToken: string,
  args: {
    text: string;
    image?: { bytes: ArrayBuffer; contentType: string } | null;
  },
): Promise<Result<PublishTweetResult>> {
  let mediaId: string | null = null;
  if (args.image) {
    const uploaded = await uploadMedia(accessToken, args.image);
    if (!uploaded.ok) return uploaded;
    mediaId = uploaded.value;
  }

  try {
    const response = await fetch(`${API}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        text: args.text,
        ...(mediaId && { media: { media_ids: [mediaId] } }),
      }),
    });
    if (!response.ok) {
      await logFailure("tweets", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json().catch(() => ({}))) as {
      data?: { id?: string };
    };
    const tweetId = json.data?.id;
    if (!tweetId) {
      console.error("[twitter] tweets sem id na resposta");
      return err(socialOauthFailed());
    }
    return ok({
      tweetId,
      permalink: `https://twitter.com/i/web/status/${tweetId}`,
    });
  } catch (error) {
    console.error("[twitter] tweets erro de rede", error);
    return err(socialOauthFailed());
  }
}
