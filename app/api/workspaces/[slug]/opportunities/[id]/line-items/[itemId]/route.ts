import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { UpdateLineItemSchema } from "@/src/schemas/opportunity-line-item.schema";
import { OpportunityLineItemService } from "@/src/services/opportunity-line-item.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string; itemId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = UpdateLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug, id, itemId } = await params;
  const result = await OpportunityLineItemService.update(
    session.value.user.id,
    slug,
    id,
    itemId,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug, id, itemId } = await params;
  const result = await OpportunityLineItemService.remove(
    session.value.user.id,
    slug,
    id,
    itemId,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse({ deleted: true });
}
