import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { UpdateWidgetSchema } from "@/src/schemas/dashboard-widget.schema";
import { DashboardWidgetService } from "@/src/services/dashboard-widget.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string; widgetId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = UpdateWidgetSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, id, widgetId } = await params;
  const result = await DashboardWidgetService.update(
    session.value.user.id,
    slug,
    id,
    widgetId,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id, widgetId } = await params;
  const result = await DashboardWidgetService.remove(
    session.value.user.id,
    slug,
    id,
    widgetId,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
