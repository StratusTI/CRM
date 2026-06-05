import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/src/errors/app-error";
import { emailSyncTick } from "@/src/services/email-sync.service";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Cron de sincronização de e-mail/calendário. Auth via `Authorization: Bearer
 * $CRON_SECRET`. Importa as mensagens/eventos recentes de todas as contas
 * conectadas, vinculando-as a contatos e alimentando a timeline. Idempotente.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return handleError(forbidden("CRON_SECRET não configurado"));

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided !== secret) return handleError(unauthorized());

  const result = await emailSyncTick();
  return successResponse(result);
}
