import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { IngestLeadSchema } from "@/src/schemas/lead-ingest.schema";
import { IntegrationApiKeyService } from "@/src/services/integration-api-key.service";
import { LeadService } from "@/src/services/lead.service";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Ingestão de leads vinda de canais de marketing (WhatsApp, ligação, direct).
 * Cria um **Lead** (pontuado e roteado automaticamente). A conversão em
 * Pessoa + Oportunidade é feita depois, manualmente, no CRM.
 * Autenticação por chave de API da workspace (header `Authorization: Bearer`).
 * A workspace e o autor são resolvidos pela própria chave.
 */
export async function POST(request: NextRequest) {
  const auth = await IntegrationApiKeyService.authenticate(
    request.headers.get("authorization"),
  );
  if (!auth.ok) return handleError(auth.error);

  const body = await request.json().catch(() => null);
  const parsed = IngestLeadSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await LeadService.createFromIngest(
    auth.value.workspaceId,
    auth.value.actorUserId,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}
