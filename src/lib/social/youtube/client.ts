import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  PublishVideoResult,
  YoutubeChannelOverview,
  YoutubeInsights,
  YoutubeInsightsPoint,
  YoutubePrivacy,
} from "@/src/schemas/youtube.schema";

/**
 * Cliente HTTP das APIs do YouTube, sobre um access token já fresco (o service
 * garante o frescor antes de chamar aqui). Cada função traduz a resposta crua do
 * Google para os DTOs do nosso contrato e converte qualquer falha em
 * `socialOauthFailed`, preservando o corpo do erro no log para diagnóstico
 * (foi o que revelou a "API desabilitada" no YouTube).
 */

const DATA_API = "https://www.googleapis.com/youtube/v3";
const ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2";
const UPLOAD_API =
  "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable";

/** Log padronizado de falha de chamada à API do YouTube. */
async function logFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(
    `[youtube] ${label} falhou`,
    response.status,
    body.slice(0, 500),
  );
}

/** Inteiro a partir de string da API (campos numéricos vêm como string). */
function toInt(value: unknown): number {
  const n =
    typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Visão do canal: identidade (snippet) + métricas agregadas (statistics). */
export async function fetchChannelOverview(
  accessToken: string,
): Promise<Result<YoutubeChannelOverview>> {
  try {
    const response = await fetch(
      `${DATA_API}/channels?part=snippet,statistics&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      await logFailure("channels", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json()) as {
      items?: {
        id: string;
        snippet?: {
          title?: string;
          description?: string;
          customUrl?: string;
          thumbnails?: {
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
        statistics?: {
          subscriberCount?: string;
          viewCount?: string;
          videoCount?: string;
        };
      }[];
    };

    const channel = json.items?.[0];
    if (!channel) return err(socialOauthFailed("Nenhum canal encontrado"));

    const snippet = channel.snippet ?? {};
    const stats = channel.statistics ?? {};
    return ok({
      channelId: channel.id,
      title: snippet.title ?? "Canal",
      description: snippet.description ?? null,
      customUrl: snippet.customUrl ?? null,
      thumbnailUrl:
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        null,
      subscriberCount: toInt(stats.subscriberCount),
      viewCount: toInt(stats.viewCount),
      videoCount: toInt(stats.videoCount),
    });
  } catch (error) {
    console.error("[youtube] channels erro de rede", error);
    return err(socialOauthFailed());
  }
}

/**
 * Série temporal de métricas via YouTube Analytics API. Requer que essa API
 * esteja habilitada no projeto Google Cloud (separada da Data API).
 */
export async function fetchInsights(
  accessToken: string,
  args: { range: YoutubeInsights["range"]; startDate: string; endDate: string },
): Promise<Result<YoutubeInsights>> {
  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate: args.startDate,
    endDate: args.endDate,
    metrics: "views,estimatedMinutesWatched,subscribersGained",
    dimensions: "day",
    sort: "day",
  });

  try {
    const response = await fetch(
      `${ANALYTICS_API}/reports?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      await logFailure("analytics", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json()) as {
      rows?: [string, number, number, number][];
    };

    const series: YoutubeInsightsPoint[] = (json.rows ?? []).map((row) => ({
      date: row[0],
      views: toInt(row[1]),
      estimatedMinutesWatched: toInt(row[2]),
      subscribersGained: toInt(row[3]),
    }));

    const totals = series.reduce(
      (acc, p) => ({
        views: acc.views + p.views,
        estimatedMinutesWatched:
          acc.estimatedMinutesWatched + p.estimatedMinutesWatched,
        subscribersGained: acc.subscribersGained + p.subscribersGained,
      }),
      { views: 0, estimatedMinutesWatched: 0, subscribersGained: 0 },
    );

    return ok({
      range: args.range,
      startDate: args.startDate,
      endDate: args.endDate,
      totals,
      series,
    });
  } catch (error) {
    console.error("[youtube] analytics erro de rede", error);
    return err(socialOauthFailed());
  }
}

/**
 * Upload resumable de vídeo (2 passos): inicia a sessão com os metadados e
 * recebe uma `Location`; depois envia os bytes do arquivo nessa URL. Mantemos
 * num único PUT (o arquivo já está inteiro em memória vindo do form) — simples e
 * suficiente para vídeos de tamanho moderado.
 */
export async function uploadVideo(
  accessToken: string,
  args: {
    file: { bytes: ArrayBuffer; contentType: string };
    title: string;
    description: string;
    tags: string[];
    privacyStatus: YoutubePrivacy;
  },
): Promise<Result<PublishVideoResult>> {
  const metadata = {
    snippet: {
      title: args.title,
      description: args.description,
      tags: args.tags,
    },
    status: { privacyStatus: args.privacyStatus },
  };

  try {
    // Passo 1: abre a sessão de upload com os metadados.
    const init = await fetch(UPLOAD_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": args.file.contentType,
        "X-Upload-Content-Length": String(args.file.bytes.byteLength),
      },
      body: JSON.stringify(metadata),
    });
    if (!init.ok) {
      await logFailure("upload/init", init);
      return err(socialOauthFailed());
    }
    const uploadUrl = init.headers.get("location");
    if (!uploadUrl) {
      console.error("[youtube] upload/init sem Location");
      return err(socialOauthFailed());
    }

    // Passo 2: envia os bytes do vídeo na URL da sessão.
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": args.file.contentType },
      body: args.file.bytes,
    });
    if (!upload.ok) {
      await logFailure("upload/bytes", upload);
      return err(socialOauthFailed());
    }
    const json = (await upload.json()) as {
      id?: string;
      snippet?: { title?: string };
      status?: { privacyStatus?: YoutubePrivacy };
    };
    if (!json.id) {
      console.error("[youtube] upload sem id de vídeo");
      return err(socialOauthFailed());
    }

    return ok({
      videoId: json.id,
      url: `https://www.youtube.com/watch?v=${json.id}`,
      title: json.snippet?.title ?? args.title,
      privacyStatus: json.status?.privacyStatus ?? args.privacyStatus,
    });
  } catch (error) {
    console.error("[youtube] upload erro de rede", error);
    return err(socialOauthFailed());
  }
}

/**
 * Vídeos recentes do canal via playlist de uploads (2 chamadas: busca o id da
 * playlist em contentDetails e depois os itens). Não requer Analytics API.
 */
export async function fetchRecentVideos(
  accessToken: string,
): Promise<Result<import("@/src/schemas/youtube.schema").YoutubeVideos>> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  try {
    // Passo 1: obter o id da playlist de uploads do canal.
    const chRes = await fetch(
      `${DATA_API}/channels?part=contentDetails&mine=true`,
      { headers },
    );
    if (!chRes.ok) {
      await logFailure("channels/contentDetails", chRes);
      return err(socialOauthFailed());
    }
    const chJson = (await chRes.json()) as {
      items?: {
        contentDetails?: {
          relatedPlaylists?: { uploads?: string };
        };
      }[];
    };
    const uploadsPlaylistId =
      chJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      console.error("[youtube] playlist de uploads não encontrada");
      return err(socialOauthFailed("Playlist de uploads não encontrada"));
    }

    // Passo 2: buscar os itens da playlist (vídeos mais recentes).
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "20",
    });
    const plRes = await fetch(
      `${DATA_API}/playlistItems?${params.toString()}`,
      { headers },
    );
    if (!plRes.ok) {
      await logFailure("playlistItems", plRes);
      return err(socialOauthFailed());
    }
    const plJson = (await plRes.json()) as {
      items?: {
        snippet?: {
          title?: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
        contentDetails?: { videoId?: string };
      }[];
    };

    const baseVideos = (plJson.items ?? [])
      .map((item) => {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) return null;
        return {
          videoId,
          title: item.snippet?.title ?? "",
          thumbnailUrl:
            item.snippet?.thumbnails?.medium?.url ??
            item.snippet?.thumbnails?.default?.url ??
            null,
          publishedAt: item.snippet?.publishedAt ?? "",
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    // Passo 3: buscar estatísticas e duração por vídeo.
    const statsMap = new Map<
      string,
      { viewCount: number; likeCount: number; commentCount: number; duration: string | null }
    >();
    if (baseVideos.length > 0) {
      const ids = baseVideos.map((v) => v.videoId).join(",");
      const statsParams = new URLSearchParams({
        part: "statistics,contentDetails",
        id: ids,
      });
      const statsRes = await fetch(
        `${DATA_API}/videos?${statsParams.toString()}`,
        { headers },
      );
      if (statsRes.ok) {
        const statsJson = (await statsRes.json()) as {
          items?: {
            id?: string;
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
            contentDetails?: { duration?: string };
          }[];
        };
        for (const item of statsJson.items ?? []) {
          if (item.id) {
            statsMap.set(item.id, {
              viewCount: toInt(item.statistics?.viewCount),
              likeCount: toInt(item.statistics?.likeCount),
              commentCount: toInt(item.statistics?.commentCount),
              duration: item.contentDetails?.duration ?? null,
            });
          }
        }
      }
    }

    const videos = baseVideos.map((v) => {
      const stats = statsMap.get(v.videoId);
      return {
        ...v,
        viewCount: stats?.viewCount ?? 0,
        likeCount: stats?.likeCount ?? 0,
        commentCount: stats?.commentCount ?? 0,
        duration: stats?.duration ?? null,
      };
    });

    return ok({ videos });
  } catch (error) {
    console.error("[youtube] fetchRecentVideos erro de rede", error);
    return err(socialOauthFailed());
  }
}
