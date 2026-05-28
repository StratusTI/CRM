import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { WorkflowService } from "@/src/services/workflow.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);
  const { slug, id } = await params;
  const result = await WorkflowService.listVersions(
    session.value.user.id,
    slug,
    id,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}
