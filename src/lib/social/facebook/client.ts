import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import type {
  FacebookInsights,
  FacebookInsightsPoint,
  FacebookPageOverview,
  PublishPostResult,
} from "@/src/schemas/facebook.schema";

/**
 * Cliente HTTP da Graph API do Facebook, sobre um **Page token** já resolvido (o
 * service garante o token e o id da Página). Cada função traduz a resposta crua
 * para os DTOs do contrato e converte falhas em `socialOauthFailed`, preservando
 * o corpo do erro no log (mesmo padrão de diagnóstico do YouTube).
 */
const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Métricas diárias de Página → campo do nosso DTO. A Meta vem descontinuando
 * métricas de Página em ondas (nov/2025, jun/2026), então buscamos CADA uma
 * isoladamente (ver fetchInsights): uma métrica morta apenas não contribui, em
 * vez de derrubar a chamada inteira. Os nomes são confirmados ao vivo.
 */
const INSIGHT_METRICS: {
  metric: string;
  key: keyof Omit<FacebookInsightsPoint, "date">;
}[] = [
  { metric: "page_impressions_unique", key: "impressions" },
  { metric: "page_post_engagements", key: "engagements" },
  { metric: "page_daily_follows", key: "fanAdds" },
];

async function logFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(
    `[facebook] ${label} falhou`,
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
    console.error(`[facebook] ${label} erro de rede`, error);
    return err(socialOauthFailed());
  }
}

/** Visão da Página: identidade + contagens atuais. */
export async function fetchPageOverview(
  pageToken: string,
  pageId: string,
): Promise<Result<FacebookPageOverview>> {
  const params = new URLSearchParams({
    fields: "id,name,about,link,fan_count,followers_count,picture.type(large)",
    access_token: pageToken,
  });
  const result = await graphGet<{
    id: string;
    name?: string;
    about?: string;
    link?: string;
    fan_count?: number;
    followers_count?: number;
    picture?: { data?: { url?: string } };
  }>("page", `${GRAPH}/${pageId}?${params.toString()}`);
  if (!result.ok) return result;

  const page = result.value;
  return ok({
    pageId: page.id,
    name: page.name ?? "Página",
    about: page.about ?? null,
    link: page.link ?? null,
    pictureUrl: page.picture?.data?.url ?? null,
    fanCount: toInt(page.fan_count),
    followersCount: toInt(page.followers_count),
  });
}

/**
 * Série diária de insights da Página. O Graph devolve um array por métrica, cada
 * um com valores diários (`{ value, end_time }`); reorganizamos por dia.
 */
export async function fetchInsights(
  pageToken: string,
  pageId: string,
  args: {
    range: FacebookInsights["range"];
    startDate: string;
    endDate: string;
  },
): Promise<Result<FacebookInsights>> {
  // Um ponto por dia, criado sob demanda conforme as métricas chegam.
  const byDate = new Map<string, FacebookInsightsPoint>();
  const pointFor = (date: string): FacebookInsightsPoint => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const fresh = { date, impressions: 0, engagements: 0, fanAdds: 0 };
    byDate.set(date, fresh);
    return fresh;
  };

  // Cada métrica é buscada isoladamente: se uma estiver descontinuada (a Meta
  // recusa a chamada toda quando UMA métrica é inválida), ela só não contribui.
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
        `${GRAPH}/${pageId}/insights?${params.toString()}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) {
        await logFailure(`insights(${metric})`, res);
        continue;
      }
      json = await res.json();
    } catch (error) {
      console.error(`[facebook] insights(${metric}) erro de rede`, error);
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
      engagements: acc.engagements + p.engagements,
      fanAdds: acc.fanAdds + p.fanAdds,
    }),
    { impressions: 0, engagements: 0, fanAdds: 0 },
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
 * Publica na Página. Com imagem → `/photos` (a imagem vira o post, com a mensagem
 * como legenda); sem imagem → `/feed` (mensagem + link opcional). Retorna o id do
 * post e a URL para abri-lo.
 */
export async function publishPost(
  pageToken: string,
  pageId: string,
  args: {
    message: string;
    link: string | null;
    image: { bytes: ArrayBuffer; contentType: string } | null;
  },
): Promise<Result<PublishPostResult>> {
  try {
    if (args.image) {
      const form = new FormData();
      form.set("access_token", pageToken);
      if (args.message) form.set("message", args.message);
      form.set(
        "source",
        new Blob([args.image.bytes], { type: args.image.contentType }),
        "upload",
      );
      const response = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        await logFailure("photos", response);
        return err(socialOauthFailed());
      }
      const json = (await response.json()) as { id?: string; post_id?: string };
      const postId = json.post_id ?? json.id;
      if (!postId) return err(socialOauthFailed("Publicação sem id"));
      return ok({ postId, url: `https://www.facebook.com/${postId}` });
    }

    const body = new URLSearchParams({
      access_token: pageToken,
      message: args.message,
    });
    if (args.link) body.set("link", args.link);
    const response = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) {
      await logFailure("feed", response);
      return err(socialOauthFailed());
    }
    const json = (await response.json()) as { id?: string };
    if (!json.id) return err(socialOauthFailed("Publicação sem id"));
    return ok({ postId: json.id, url: `https://www.facebook.com/${json.id}` });
  } catch (error) {
    console.error("[facebook] publish erro de rede", error);
    return err(socialOauthFailed());
  }
}

/** Posts recentes da Página (feed público). */
export async function fetchRecentPosts(
  pageToken: string,
  pageId: string,
): Promise<Result<import("@/src/schemas/facebook.schema").FacebookPosts>> {
  const params = new URLSearchParams({
    fields: "id,message,story,full_picture,permalink_url,created_time",
    limit: "20",
    access_token: pageToken,
  });
  const result = await graphGet<{
    data?: {
      id?: string;
      message?: string;
      story?: string;
      full_picture?: string;
      permalink_url?: string;
      created_time?: string;
    }[];
  }>("posts", `${GRAPH}/${pageId}/posts?${params.toString()}`);
  if (!result.ok) return result;

  const posts = (result.value.data ?? []).map((item) => ({
    id: item.id ?? "",
    message: item.message ?? null,
    story: item.story ?? null,
    fullPicture: item.full_picture ?? null,
    permalinkUrl: item.permalink_url ?? null,
    createdTime: item.created_time ?? "",
  }));

  return ok({ posts });
}
