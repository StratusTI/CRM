import type { NextRequest } from "next/server";
import { badRequest } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { FacebookService } from "@/src/services/facebook.service";
import { InstagramService } from "@/src/services/instagram.service";
import { TiktokService } from "@/src/services/tiktok.service";
import { TwitterService } from "@/src/services/twitter.service";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/**
 * Conteúdo recente da conta (posts, vídeos ou tweets). Cada plataforma mapeia
 * para uma fonte diferente de dados:
 * - TIKTOK    → Display API (video/list)
 * - YOUTUBE   → Data API (playlistItems da playlist de uploads)
 * - INSTAGRAM → Graph API (/{id}/media)
 * - FACEBOOK  → Graph API (/{id}/posts)
 * - TWITTER   → API v2 (GET /users/:id/tweets)
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const platform = parsePlatformSlug(platformSlug);
  const userId = session.value.user.id;

  switch (platform) {
    case "TIKTOK": {
      const result = await TiktokService.getVideos(userId, slug);
      return result.ok ? successResponse(result.value) : handleError(result.error);
    }
    case "YOUTUBE": {
      const result = await YoutubeService.getRecentVideos(userId, slug);
      return result.ok ? successResponse(result.value) : handleError(result.error);
    }
    case "INSTAGRAM": {
      const result = await InstagramService.getRecentMedia(userId, slug);
      return result.ok ? successResponse(result.value) : handleError(result.error);
    }
    case "FACEBOOK": {
      const result = await FacebookService.getRecentPosts(userId, slug);
      return result.ok ? successResponse(result.value) : handleError(result.error);
    }
    case "TWITTER": {
      const result = await TwitterService.getRecentTweets(userId, slug);
      return result.ok ? successResponse(result.value) : handleError(result.error);
    }
    default:
      return handleError(badRequest("Plataforma não suportada"));
  }
}
