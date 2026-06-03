import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { LandingPageService } from "@/src/services/landing-page.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Linhas planas de todas as visitas de landing pages do workspace — fonte dos
 * widgets de dashboard (`source = "page-views"`). 1 linha por acesso.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await LandingPageService.listWorkspaceViews(
    session.value.user.id,
    slug,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
