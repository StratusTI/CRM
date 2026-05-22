import type { NextRequest } from "next/server";
import { badRequest, validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { YoutubeInsightsRangeSchema } from "@/src/schemas/youtube.schema";
import { YoutubeService } from "@/src/services/youtube.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/** Analytics do canal (resumo + série diária) para a janela em `?range=`. */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  if (parsePlatformSlug(platformSlug) !== "YOUTUBE") {
    return handleError(badRequest("Plataforma não suportada nesta rota"));
  }

  const parsedRange = YoutubeInsightsRangeSchema.safeParse(
    request.nextUrl.searchParams.get("range") ?? undefined,
  );
  if (!parsedRange.success) {
    return handleError(validationError("Janela de tempo inválida"));
  }

  const result = await YoutubeService.getInsights(
    session.value.user.id,
    slug,
    parsedRange.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
