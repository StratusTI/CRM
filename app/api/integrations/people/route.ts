import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { IngestPeopleSchema } from "@/src/schemas/person-ingest.schema";
import { IntegrationApiKeyService } from "@/src/services/integration-api-key.service";
import { PersonIngestService } from "@/src/services/person-ingest.service";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Ingestão server-to-server de pessoas vinda de outros sistemas da empresa.
 * Autenticação por chave de API da workspace (header `Authorization: Bearer`).
 * A workspace e o autor são resolvidos pela própria chave.
 */
export async function POST(request: NextRequest) {
  const auth = await IntegrationApiKeyService.authenticate(
    request.headers.get("authorization"),
  );
  if (!auth.ok) return handleError(auth.error);

  const body = await request.json().catch(() => null);
  const parsed = IngestPeopleSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await PersonIngestService.ingest(
    auth.value.workspaceId,
    auth.value.actorUserId,
    parsed.data.people,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}
