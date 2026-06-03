import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { FormSubmissionInputSchema } from "@/src/schemas/form.schema";
import { FormService } from "@/src/services/form.service";
import { FormSubmissionService } from "@/src/services/form-submission.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ token: string }> };

/** IP do cliente a partir dos headers de proxy (nunca confia no corpo). */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Público — sem auth. Retorna o formulário só se estiver PUBLISHED. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const result = await FormService.getPublicByToken(token);
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}

/**
 * Público — sem auth. A posse vem do `token` opaco. Valida e executa a ação
 * configurada (cria empresa/pessoa/lead) atribuída ao criador do formulário.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  const parsed = FormSubmissionInputSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await FormSubmissionService.submit(token, parsed.data, {
    ip: clientIp(request),
    referrer: request.headers.get("referer"),
  });
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}
