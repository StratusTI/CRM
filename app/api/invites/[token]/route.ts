import type { NextRequest } from "next/server";
import { WorkspaceInviteService } from "@/src/services/workspace-invite.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/**
 * Tela pública de aceitar: usado pelo client para mostrar o nome do workspace
 * antes de exigir sign-in. Não requer sessão.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const result = await WorkspaceInviteService.getPublicByToken(token);
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}
