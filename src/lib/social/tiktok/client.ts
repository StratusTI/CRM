import { badRequest, socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  PublishTiktokVideoResult,
  TiktokCreatorOverview,
  TiktokVideo,
  TiktokVideos,
} from "@/src/schemas/tiktok.schema";

/**
 * Cliente HTTP das APIs do TikTok, sobre um access token já fresco (o service
 * garante o frescor antes de chamar aqui). Display API para ler perfil/vídeos e
 * Content Posting API para publicar. Cada função traduz a resposta crua para os
 * DTOs do contrato e converte falhas em `socialOauthFailed`, preservando o corpo
 * do erro no log (mesmo padrão de diagnóstico do YouTube/Facebook).
 *
 * Particularidade do TikTok: as respostas vêm num envelope `{ data, error }` e
 * `error.code === "ok"` indica sucesso — um HTTP 200 com `error.code != "ok"`
 * ainda é falha. Por isso checamos os dois.
 */
const API = "https://open.tiktokapis.com/v2";

type TikTokEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; log_id?: string };
};

/** Limite de um upload em chunk único (a Content Posting API aceita até 64 MiB). */
export const TIKTOK_SINGLE_CHUNK_MAX_BYTES = 64 * 1024 * 1024;

/** `error.code` ausente ou "ok" = sucesso; qualquer outro é falha de domínio. */
function isTikTokError(error: TikTokEnvelope<unknown>["error"]): boolean {
  return Boolean(error?.code && error.code !== "ok");
}

function logFailure(
  label: string,
  status: number,
  envelope: TikTokEnvelope<unknown>,
): void {
  console.error(
    `[tiktok] ${label} falhou`,
    status,
    JSON.stringify(envelope.error ?? {}).slice(0, 500),
  );
}

/** Inteiro tolerante (campos numéricos podem vir como string ou ausente). */
function toInt(value: unknown): number {
  const n =
    typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/** Visão do criador: identidade + estatísticas agregadas. */
export async function fetchCreatorOverview(
  accessToken: string,
): Promise<Result<TiktokCreatorOverview>> {
  const fields = [
    "open_id",
    "avatar_url",
    "display_name",
    "bio_description",
    "profile_deep_link",
    "is_verified",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");

  try {
    const response = await fetch(`${API}/user/info/?fields=${fields}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const json = (await response.json().catch(() => ({}))) as TikTokEnvelope<{
      user?: {
        open_id?: string;
        avatar_url?: string;
        display_name?: string;
        bio_description?: string;
        profile_deep_link?: string;
        is_verified?: boolean;
        follower_count?: number;
        following_count?: number;
        likes_count?: number;
        video_count?: number;
      };
    }>;
    if (!response.ok || isTikTokError(json.error)) {
      logFailure("user/info", response.status, json);
      return err(socialOauthFailed());
    }

    const user = json.data?.user ?? {};
    return ok({
      openId: user.open_id ?? "unknown",
      displayName: user.display_name || "Conta TikTok",
      bio: user.bio_description || null,
      avatarUrl: user.avatar_url || null,
      profileLink: user.profile_deep_link || null,
      isVerified: Boolean(user.is_verified),
      followerCount: toInt(user.follower_count),
      followingCount: toInt(user.following_count),
      likesCount: toInt(user.likes_count),
      videoCount: toInt(user.video_count),
    });
  } catch (error) {
    console.error("[tiktok] user/info erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Vídeos recentes (com métricas por vídeo) + totais agregados. */
export async function fetchVideos(
  accessToken: string,
  maxCount = 20,
): Promise<Result<TiktokVideos>> {
  const fields = [
    "id",
    "title",
    "video_description",
    "duration",
    "cover_image_url",
    "share_url",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
    "create_time",
  ].join(",");

  try {
    const response = await fetch(`${API}/video/list/?fields=${fields}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ max_count: maxCount }),
    });
    const json = (await response.json().catch(() => ({}))) as TikTokEnvelope<{
      videos?: {
        id?: string | number;
        title?: string;
        video_description?: string;
        duration?: number;
        cover_image_url?: string;
        share_url?: string;
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
        create_time?: number;
      }[];
    }>;
    if (!response.ok || isTikTokError(json.error)) {
      logFailure("video/list", response.status, json);
      return err(socialOauthFailed());
    }

    const videos: TiktokVideo[] = (json.data?.videos ?? []).map((v) => ({
      id: String(v.id ?? ""),
      title: v.title || v.video_description || "Sem título",
      coverImageUrl: v.cover_image_url || null,
      shareUrl: v.share_url || null,
      duration: toInt(v.duration),
      createdAt: v.create_time
        ? new Date(v.create_time * 1000).toISOString()
        : "",
      viewCount: toInt(v.view_count),
      likeCount: toInt(v.like_count),
      commentCount: toInt(v.comment_count),
      shareCount: toInt(v.share_count),
    }));

    const totals = videos.reduce(
      (acc, v) => ({
        views: acc.views + v.viewCount,
        likes: acc.likes + v.likeCount,
        comments: acc.comments + v.commentCount,
        shares: acc.shares + v.shareCount,
      }),
      { views: 0, likes: 0, comments: 0, shares: 0 },
    );

    return ok({ totals, videos });
  } catch (error) {
    console.error("[tiktok] video/list erro de rede", error);
    return err(socialOauthFailed());
  }
}

/**
 * Publica um vídeo via Direct Post (Content Posting API) em dois passos: inicia
 * o post com os metadados (recebendo `publish_id` e `upload_url`) e envia os
 * bytes do arquivo num único chunk. A TikTok processa o vídeo de forma
 * assíncrona — devolvemos o `publish_id` para rastrear, sem aguardar a conclusão.
 *
 * Restrição: apps não auditados pela TikTok só podem postar com `SELF_ONLY`
 * (privado); valores de privacidade não liberados são recusados na inicialização.
 */
export async function publishVideo(
  accessToken: string,
  args: {
    file: { bytes: ArrayBuffer; contentType: string };
    title: string;
    privacyLevel: string;
    disableComment: boolean;
    disableDuet: boolean;
    disableStitch: boolean;
  },
): Promise<Result<PublishTiktokVideoResult>> {
  const videoSize = args.file.bytes.byteLength;

  try {
    // Passo 1: inicia o post. Chunk único = arquivo inteiro.
    const init = await fetch(`${API}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: args.title,
          privacy_level: args.privacyLevel,
          disable_comment: args.disableComment,
          disable_duet: args.disableDuet,
          disable_stitch: args.disableStitch,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      }),
    });
    const initJson = (await init.json().catch(() => ({}))) as TikTokEnvelope<{
      publish_id?: string;
      upload_url?: string;
    }>;
    if (!init.ok || isTikTokError(initJson.error)) {
      logFailure("publish/init", init.status, initJson);
      if (initJson.error?.code === "unaudited_client_can_only_post_to_private_accounts") {
        return err(
          badRequest(
            "App TikTok não auditado: só é permitido publicar como Privado (só eu). Altere a privacidade ou aguarde a aprovação do app pela TikTok.",
          ),
        );
      }
      return err(socialOauthFailed());
    }

    const publishId = initJson.data?.publish_id;
    const uploadUrl = initJson.data?.upload_url;
    if (!publishId || !uploadUrl) {
      console.error("[tiktok] publish/init sem publish_id/upload_url");
      return err(socialOauthFailed());
    }

    // Passo 2: envia os bytes do vídeo no chunk único.
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": args.file.contentType || "video/mp4",
        "Content-Length": String(videoSize),
        "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
      },
      body: args.file.bytes,
    });
    if (!upload.ok) {
      console.error(
        "[tiktok] publish/upload falhou",
        upload.status,
        (await upload.text().catch(() => "")).slice(0, 500),
      );
      return err(socialOauthFailed());
    }

    return ok({ publishId, status: "PROCESSING_UPLOAD" });
  } catch (error) {
    console.error("[tiktok] publish erro de rede", error);
    return err(socialOauthFailed());
  }
}
