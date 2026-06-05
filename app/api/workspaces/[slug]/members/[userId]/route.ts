import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { WorkspaceService } from "@/src/services/workspace.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; userId: string }>;
};

const SetProfileSchema = z.object({
  profileId: z.string().trim().min(1),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = SetProfileSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, userId } = await params;
  const result = await WorkspaceService.setMemberProfile(
    session.value.user.id,
    slug,
    userId,
    parsed.data.profileId,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse({ updated: true });
}
