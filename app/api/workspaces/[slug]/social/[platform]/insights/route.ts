import type { NextRequest } from "next/server";
import { badRequest, validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { FacebookInsightsRangeSchema } from "@/src/schemas/facebook.schema";
import { GoogleAnalyticsInsightsRangeSchema } from "@/src/schemas/google-analytics.schema";
import { InstagramInsightsRangeSchema } from "@/src/schemas/instagram.schema";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { YoutubeInsightsRangeSchema } from "@/src/schemas/youtube.schema";
import { FacebookService } from "@/src/services/facebook.service";
import { GoogleAnalyticsService } from "@/src/services/google-analytics.service";
import { InstagramService } from "@/src/services/instagram.service";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/** Analytics da conta (resumo + série) para a janela em `?range=`. */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const userId = session.value.user.id;
  const platform = parsePlatformSlug(platformSlug);
  const rawRange = request.nextUrl.searchParams.get("range") ?? undefined;

  if (platform === "YOUTUBE") {
    const range = YoutubeInsightsRangeSchema.safeParse(rawRange);
    if (!range.success) {
      return handleError(validationError("Janela de tempo inválida"));
    }
    const result = await YoutubeService.getInsights(userId, slug, range.data);
    return result.ok
      ? successResponse(result.value)
      : handleError(result.error);
  }

  if (platform === "FACEBOOK") {
    const range = FacebookInsightsRangeSchema.safeParse(rawRange);
    if (!range.success) {
      return handleError(validationError("Janela de tempo inválida"));
    }
    const result = await FacebookService.getInsights(userId, slug, range.data);
    return result.ok
      ? successResponse(result.value)
      : handleError(result.error);
  }

  if (platform === "INSTAGRAM") {
    const range = InstagramInsightsRangeSchema.safeParse(rawRange);
    if (!range.success) {
      return handleError(validationError("Janela de tempo inválida"));
    }
    const result = await InstagramService.getInsights(userId, slug, range.data);
    return result.ok
      ? successResponse(result.value)
      : handleError(result.error);
  }

  if (platform === "GOOGLE_ANALYTICS") {
    const range = GoogleAnalyticsInsightsRangeSchema.safeParse(rawRange);
    if (!range.success) {
      return handleError(validationError("Janela de tempo inválida"));
    }
    const result = await GoogleAnalyticsService.getInsights(
      userId,
      slug,
      range.data,
    );
    return result.ok
      ? successResponse(result.value)
      : handleError(result.error);
  }

  return handleError(badRequest("Plataforma não suportada"));
}
