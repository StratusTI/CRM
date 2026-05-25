import type { NextRequest } from "next/server";
import { badRequest } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { TiktokService } from "@/src/services/tiktok.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/**
 * Vídeos recentes da conta (com métricas por vídeo). É o análogo do TikTok ao
 * `insights` das demais plataformas — a Display API não expõe série temporal,
 * então a "analytics" é a lista de vídeos. Só o TikTok suporta esta rota.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const platform = parsePlatformSlug(platformSlug);

  if (platform !== "TIKTOK") {
    return handleError(badRequest("Plataforma não suportada"));
  }

  const result = await TiktokService.getVideos(session.value.user.id, slug);
  return result.ok ? successResponse(result.value) : handleError(result.error);
}
