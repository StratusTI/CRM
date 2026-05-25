import type { NextRequest } from "next/server";
import { badRequest } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { FacebookService } from "@/src/services/facebook.service";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/** Visão da conta conectada (formato específico por plataforma). */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const userId = session.value.user.id;
  const platform = parsePlatformSlug(platformSlug);

  const result =
    platform === "YOUTUBE"
      ? await YoutubeService.getOverview(userId, slug)
      : platform === "FACEBOOK"
        ? await FacebookService.getOverview(userId, slug)
        : null;

  if (!result) return handleError(badRequest("Plataforma não suportada"));
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
