import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { WorkspaceInviteService } from "@/src/services/workspace-invite.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { token } = await params;
  const result = await WorkspaceInviteService.accept(
    session.value.user.id,
    token,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
