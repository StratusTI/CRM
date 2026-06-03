import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { FormService } from "@/src/services/form.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Linhas planas de todas as respostas de formulários do workspace — fonte dos
 * widgets de dashboard (`source = "form-submissions"`). 1 linha por submissão.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await FormService.listWorkspaceSubmissions(
    session.value.user.id,
    slug,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
