import type { NextRequest } from "next/server";
import { badRequest } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { SocialConnectionService } from "@/src/services/social-connection.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, platform: platformSlug } = await params;
  const platform = parsePlatformSlug(platformSlug);
  if (!platform) return handleError(badRequest("Plataforma inválida"));

  const result = await SocialConnectionService.disconnect(
    session.value.user.id,
    slug,
    platform,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse({ disconnected: true });
}
