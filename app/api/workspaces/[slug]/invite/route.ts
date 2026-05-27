import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { NEXT_PUBLIC_URL } from "@/lib/env/env";
import { getAuthSession } from "@/src/lib/auth-session";
import { UpdateWorkspaceInviteSchema } from "@/src/schemas/workspace-invite.schema";
import { WorkspaceInviteService } from "@/src/services/workspace-invite.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await WorkspaceInviteService.getOrCreate(
    session.value.user.id,
    slug,
    NEXT_PUBLIC_URL,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = UpdateWorkspaceInviteSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await WorkspaceInviteService.update(
    session.value.user.id,
    slug,
    parsed.data,
    NEXT_PUBLIC_URL,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
