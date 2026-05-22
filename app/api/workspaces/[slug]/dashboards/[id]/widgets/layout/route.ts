import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { WidgetLayoutBatchSchema } from "@/src/schemas/dashboard-widget.schema";
import { DashboardWidgetService } from "@/src/services/dashboard-widget.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = WidgetLayoutBatchSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, id } = await params;
  const result = await DashboardWidgetService.applyLayout(
    session.value.user.id,
    slug,
    id,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse({ applied: true });
}
