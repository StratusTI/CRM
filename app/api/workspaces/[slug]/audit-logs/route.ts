import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { AuditQuerySchema } from "@/src/schemas/activity.schema";
import { ActivityService } from "@/src/services/activity.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const sp = request.nextUrl.searchParams;
  const parsed = AuditQuerySchema.safeParse({
    entity: sp.get("entity") ?? undefined,
    actorUserId: sp.get("actorUserId") ?? undefined,
    action: sp.get("action") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return handleError(
      validationError("Filtros inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await ActivityService.auditList(
    session.value.user.id,
    slug,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
