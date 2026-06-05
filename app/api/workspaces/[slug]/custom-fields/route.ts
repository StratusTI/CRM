import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import {
  CreateCustomFieldSchema,
  CUSTOM_FIELD_ENTITIES,
} from "@/src/schemas/custom-field.schema";
import { CustomFieldService } from "@/src/services/custom-field.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const EntityQuerySchema = z.enum(CUSTOM_FIELD_ENTITIES).optional();

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = CreateCustomFieldSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await CustomFieldService.create(
    session.value.user.id,
    slug,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const entity = EntityQuerySchema.safeParse(
    request.nextUrl.searchParams.get("entity") ?? undefined,
  );

  const { slug } = await params;
  const result = await CustomFieldService.list(
    session.value.user.id,
    slug,
    entity.success ? entity.data : undefined,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
