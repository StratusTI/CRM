import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { SocialTrendingService } from "@/src/services/social-trending.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/** Ranking "Em Alta": posts de hoje (TikTok + Instagram) por velocidade de engajamento. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await SocialTrendingService.getTodayRanking(
    session.value.user.id,
    slug,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
