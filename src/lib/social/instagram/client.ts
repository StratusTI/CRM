import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  InstagramInsights,
  InstagramInsightsPoint,
  InstagramProfileOverview,
  PublishInstagramPostResult,
} from "@/src/schemas/instagram.schema";

/**
 * Cliente HTTP da Graph API do Instagram (Meta). Recebe sempre um **Page token**
 * já resolvido (o service garante token + id da conta IG vinda do provider) e
 * traduz a resposta crua para os DTOs do contrato. Mesmo padrão de diagnóstico
 * do Facebook: falhas viram `socialOauthFailed` com corpo logado.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Métricas diárias da conta IG → campo do DTO. A Meta descontinua métricas IG
 * em ondas (ex.: `impressions` em abril/2024 para vários tipos de conta), então
 * cada métrica é buscada isoladamente — uma morta apenas não contribui, em vez
 * de derrubar a chamada inteira. Espelha a estratégia do Facebook.
 */
const INSIGHT_METRICS: {
  metric: string;
  key: keyof Omit<InstagramInsightsPoint, "date">;
}[] = [
  { metric: "impressions", key: "impressions" },
  { metric: "reach", key: "reach" },
  { metric: "profile_views", key: "profileViews" },
];

async function logFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(
    `[instagram] ${label} falhou`,
    response.status,
    body.slice(0, 500),
  );
}

function toInt(value: unknown): number {
  const n =
    typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** GET autenticado por `access_token` na query (padrão do Graph). */
async function graphGet<T>(label: string, url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      await logFailure(label, response);
      return err(socialOauthFailed());
    }
    return ok((await response.json()) as T);
  } catch (error) {
    console.error(`[instagram] ${label} erro de rede`, error);
    return err(socialOauthFailed());
  }
}

/** Identidade da conta IG + contagens atuais. */
export async function fetchProfile(
  pageToken: string,
  igAccountId: string,
): Promise<Result<InstagramProfileOverview>> {
  const params = new URLSearchParams({
    fields:
      "id,username,name,biography,profile_picture_url,media_count,followers_count,follows_count",
    access_token: pageToken,
  });
  const result = await graphGet<{
    id: string;
    username?: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
    media_count?: number;
    followers_count?: number;
    follows_count?: number;
  }>("profile", `${GRAPH}/${igAccountId}?${params.toString()}`);
  if (!result.ok) return result;

  const p = result.value;
  return ok({
    igAccountId: p.id,
    username: p.username ?? "",
    name: p.name ?? null,
    biography: p.biography ?? null,
    profilePictureUrl: p.profile_picture_url ?? null,
    mediaCount: toInt(p.media_count),
    followersCount: toInt(p.followers_count),
    followsCount: toInt(p.follows_count),
  });
}

/**
 * Série diária de insights da conta. O Graph devolve um array por métrica, cada
 * um com valores diários (`{ value, end_time }`); reorganizamos por dia.
 */
export async function fetchInsights(
  pageToken: string,
  igAccountId: string,
  args: {
    range: InstagramInsights["range"];
    startDate: string;
    endDate: string;
  },
): Promise<Result<InstagramInsights>> {
  // Um ponto por dia, criado sob demanda conforme as métricas chegam.
  const byDate = new Map<string, InstagramInsightsPoint>();
  const pointFor = (date: string): InstagramInsightsPoint => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const fresh = { date, impressions: 0, reach: 0, profileViews: 0 };
    byDate.set(date, fresh);
    return fresh;
  };

  for (const { metric, key } of INSIGHT_METRICS) {
    const params = new URLSearchParams({
      metric,
      period: "day",
      since: args.startDate,
      until: args.endDate,
      access_token: pageToken,
    });
    let json: {
      data?: { values?: { value?: number; end_time?: string }[] }[];
    };
    try {
      const res = await fetch(
        `${GRAPH}/${igAccountId}/insights?${params.toString()}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) {
        await logFailure(`insights(${metric})`, res);
        continue;
      }
      json = await res.json();
    } catch (error) {
      console.error(`[instagram] insights(${metric}) erro de rede`, error);
      continue;
    }
    for (const m of json.data ?? []) {
      for (const point of m.values ?? []) {
        if (!point.end_time) continue;
        pointFor(point.end_time.slice(0, 10))[key] = toInt(point.value);
      }
    }
  }

  const series = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const totals = series.reduce(
    (acc, p) => ({
      impressions: acc.impressions + p.impressions,
      reach: acc.reach + p.reach,
      profileViews: acc.profileViews + p.profileViews,
    }),
    { impressions: 0, reach: 0, profileViews: 0 },
  );

  return ok({
    range: args.range,
    startDate: args.startDate,
    endDate: args.endDate,
    totals,
    series,
  });
}

/**
 * Publica uma imagem no feed. O fluxo do Graph é em 2 passos: cria um container
 * (`/media` com `image_url`) e depois publica (`/media_publish` com `creation_id`).
 * `image_url` precisa ser HTTP público acessível pelo servidor da Meta — o service
 * usa o [[blob-store]] (rota `/api/social/blob/[token]`) para servir os bytes
 * enviados via upload do usuário.
 */
export async function publishPost(
  pageToken: string,
  igAccountId: string,
  args: { caption: string; imageUrl: string },
): Promise<Result<PublishInstagramPostResult>> {
  try {
    // 1) Container — descreve a mídia. Para v1 só IMAGE (sem REEL/VIDEO/CAROUSEL).
    const containerBody = new URLSearchParams({
      image_url: args.imageUrl,
      access_token: pageToken,
    });
    if (args.caption) containerBody.set("caption", args.caption);

    const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: containerBody.toString(),
    });
    if (!containerRes.ok) {
      await logFailure("media (container)", containerRes);
      return err(socialOauthFailed());
    }
    const containerJson = (await containerRes.json()) as { id?: string };
    if (!containerJson.id) return err(socialOauthFailed("Container sem id"));

    // 2) Publish — promove o container a um post real do feed.
    const publishBody = new URLSearchParams({
      creation_id: containerJson.id,
      access_token: pageToken,
    });
    const publishRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody.toString(),
    });
    if (!publishRes.ok) {
      await logFailure("media_publish", publishRes);
      return err(socialOauthFailed());
    }
    const publishJson = (await publishRes.json()) as { id?: string };
    if (!publishJson.id) return err(socialOauthFailed("Publicação sem id"));

    // 3) Permalink (best-effort) — não bloqueia o sucesso da publicação.
    let permalink: string | null = null;
    const permaParams = new URLSearchParams({
      fields: "permalink",
      access_token: pageToken,
    });
    const permaResult = await graphGet<{ permalink?: string }>(
      "permalink",
      `${GRAPH}/${publishJson.id}?${permaParams.toString()}`,
    );
    if (permaResult.ok) permalink = permaResult.value.permalink ?? null;

    return ok({ postId: publishJson.id, permalink });
  } catch (error) {
    console.error("[instagram] publish erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Mídias recentes do perfil (feed): imagens, vídeos e carrosséis. */
export async function fetchRecentMedia(
  pageToken: string,
  igAccountId: string,
): Promise<Result<import("@/src/schemas/instagram.schema").InstagramMediaList>> {
  const params = new URLSearchParams({
    fields:
      "id,media_type,media_url,thumbnail_url,caption,timestamp,permalink",
    limit: "20",
    access_token: pageToken,
  });
  const result = await graphGet<{
    data?: {
      id?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      caption?: string;
      timestamp?: string;
      permalink?: string;
    }[];
  }>("media", `${GRAPH}/${igAccountId}/media?${params.toString()}`);
  if (!result.ok) return result;

  const media = (result.value.data ?? []).map((item) => ({
    id: item.id ?? "",
    mediaType: (item.media_type ?? "IMAGE") as
      | "IMAGE"
      | "VIDEO"
      | "CAROUSEL_ALBUM",
    mediaUrl: item.media_url ?? null,
    thumbnailUrl: item.thumbnail_url ?? null,
    caption: item.caption ?? null,
    timestamp: item.timestamp ?? "",
    permalink: item.permalink ?? null,
  }));

  return ok({ media });
}
