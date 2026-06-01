import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { RecordViewSchema } from "@/src/schemas/proposal.schema";
import { ProposalService } from "@/src/services/proposal.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ token: string }> };

/** IP do cliente a partir dos headers de proxy (nunca confia no corpo). */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Endpoint público — sem auth. A posse vem do `token` opaco. O corpo chega via
 * `fetch`/`navigator.sendBeacon`. Registra/atualiza a métrica de leitura;
 * falha silenciosamente para o cliente (a página pública não bloqueia leitura).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  const parsed = RecordViewSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await ProposalService.recordView(token, parsed.data, {
    ip: clientIp(request),
    referrer: request.headers.get("referer"),
  });
  if (!result.ok) return handleError(result.error);

  return successResponse({ recorded: true }, 202);
}
