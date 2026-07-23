import type { NextRequest } from "next/server";
import { badRequest } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { InstagramService } from "@/src/services/instagram.service";
import { TiktokService } from "@/src/services/tiktok.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/**
 * Resumo semanal de engajamento (views/saves/visitas ao perfil + top 5 posts
 * mais quentes dos últimos 7 dias). Só Instagram e TikTok por ora — as demais
 * plataformas não têm um "feed de posts" equivalente na aba Analytics.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const platform = parsePlatformSlug(platformSlug);
  const userId = session.value.user.id;

  if (platform === "INSTAGRAM") {
    const result = await InstagramService.getWeeklyEngagement(userId, slug);
    return result.ok
      ? successResponse(result.value)
      : handleError(result.error);
  }

  if (platform === "TIKTOK") {
    const result = await TiktokService.getWeeklyEngagement(userId, slug);
    return result.ok
      ? successResponse(result.value)
      : handleError(result.error);
  }

  return handleError(badRequest("Plataforma não suportada"));
}
