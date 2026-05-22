import { getAuthSession } from "@/src/lib/auth-session";
import { WorkspaceService } from "@/src/services/workspace.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await WorkspaceService.getBySlug(session.value.user.id, slug);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
