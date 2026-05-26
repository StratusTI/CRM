import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import {
  SOCIAL_PLATFORM_LABELS,
  type SocialPlatform,
  SocialPlatformSchema,
} from "@/src/schemas/social-connection.schema";
import { FacebookService } from "@/src/services/facebook.service";
import { GoogleAnalyticsService } from "@/src/services/google-analytics.service";
import { InstagramService } from "@/src/services/instagram.service";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Série diária agregada das redes conectadas — alimenta o widget de chart com
 * source = "socials". Cada linha é `{ date, platform, value }`; o chart pivota
 * por `platform` (groupBy automático) gerando uma linha por rede.
 *
 * Mapeamento por métrica (o que cada rede chama de "views" / "followers"):
 *  - views:     YT = views · IG = profileViews · FB = impressions · GA = screenPageViews
 *  - followers: YT = subscribersGained · FB = fanAdds  (delta diário, não estoque)
 * Plataformas que não suportam a métrica são puladas silenciosamente — a UI
 * só deixa selecionar as compatíveis. TikTok não tem série diária pronta.
 */

const RangeSchema = z.enum(["7d", "28d", "90d"]).default("28d");
const MetricSchema = z.enum(["views", "followers"]);

type SeriesRange = z.infer<typeof RangeSchema>;
type SocialMetric = z.infer<typeof MetricSchema>;
type SeriesRow = { date: string; platform: string } & Record<
  string,
  number | string
>;

async function platformSeries(
  userId: string,
  slug: string,
  platform: SocialPlatform,
  metric: SocialMetric,
  range: SeriesRange,
): Promise<SeriesRow[]> {
  const label = SOCIAL_PLATFORM_LABELS[platform];

  if (platform === "YOUTUBE") {
    const r = await YoutubeService.getInsights(userId, slug, range);
    if (!r.ok) return [];
    return r.value.series.map((p) => ({
      date: p.date,
      platform: label,
      [metric]: metric === "views" ? p.views : p.subscribersGained,
    }));
  }

  if (platform === "FACEBOOK") {
    const r = await FacebookService.getInsights(userId, slug, range);
    if (!r.ok) return [];
    return r.value.series.map((p) => ({
      date: p.date,
      platform: label,
      [metric]: metric === "views" ? p.impressions : p.fanAdds,
    }));
  }

  // Redes abaixo só têm série de "views" (não há delta de followers consistente).
  if (metric === "followers") return [];

  if (platform === "INSTAGRAM") {
    const r = await InstagramService.getInsights(userId, slug, range);
    if (!r.ok) return [];
    return r.value.series.map((p) => ({
      date: p.date,
      platform: label,
      [metric]: p.profileViews,
    }));
  }

  if (platform === "GOOGLE_ANALYTICS") {
    const r = await GoogleAnalyticsService.getInsights(userId, slug, range);
    if (!r.ok) return [];
    return r.value.series.map((p) => ({
      date: p.date,
      platform: label,
      [metric]: p.screenPageViews,
    }));
  }

  return []; // TIKTOK: sem série diária na API.
}

const PlatformsSchema = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(SocialPlatformSchema).max(5));

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const search = request.nextUrl.searchParams;

  const parsed = z
    .object({
      metric: MetricSchema,
      platforms: PlatformsSchema,
      range: RangeSchema,
    })
    .safeParse({
      metric: search.get("metric") ?? undefined,
      platforms: search.get("platforms") ?? "",
      range: search.get("range") ?? undefined,
    });

  if (!parsed.success) {
    return handleError(validationError("Parâmetros inválidos"));
  }

  const userId = session.value.user.id;
  const { metric, platforms, range } = parsed.data;

  const series = await Promise.all(
    platforms.map((p) =>
      platformSeries(userId, slug, p, metric, range).catch(
        () => [] as SeriesRow[],
      ),
    ),
  );

  return successResponse(series.flat());
}
