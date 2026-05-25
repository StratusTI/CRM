import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { CreateIntegrationApiKeySchema } from "@/src/schemas/integration-api-key.schema";
import { IntegrationApiKeyService } from "@/src/services/integration-api-key.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = CreateIntegrationApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await IntegrationApiKeyService.create(
    session.value.user.id,
    slug,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await IntegrationApiKeyService.list(
    session.value.user.id,
    slug,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
