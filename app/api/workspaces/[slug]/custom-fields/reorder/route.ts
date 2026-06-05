import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { CUSTOM_FIELD_ENTITIES } from "@/src/schemas/custom-field.schema";
import { CustomFieldService } from "@/src/services/custom-field.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const ReorderCustomFieldSchema = z.object({
  entity: z.enum(CUSTOM_FIELD_ENTITIES),
  ids: z.array(z.string().trim().min(1)).max(2000),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = ReorderCustomFieldSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await CustomFieldService.reorder(
    session.value.user.id,
    slug,
    parsed.data.entity,
    parsed.data.ids,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse({ reordered: true });
}
