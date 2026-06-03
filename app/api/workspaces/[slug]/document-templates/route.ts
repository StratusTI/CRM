import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import {
  CreateDocumentTemplateSchema,
  ListDocumentTemplatesQuerySchema,
} from "@/src/schemas/document-template.schema";
import { DocumentTemplateService } from "@/src/services/document-template.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const parsed = ListDocumentTemplatesQuerySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? undefined,
  });
  if (!parsed.success) {
    return handleError(
      validationError("Filtro inválido", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await DocumentTemplateService.list(
    session.value.user.id,
    slug,
    parsed.data.type,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = CreateDocumentTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await DocumentTemplateService.create(
    session.value.user.id,
    slug,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}
