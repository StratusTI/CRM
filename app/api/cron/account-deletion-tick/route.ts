import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/src/errors/app-error";
import { accountDeletionTick } from "@/src/services/account-deletion.service";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Endpoint do cron do sistema. Auth via `Authorization: Bearer $CRON_SECRET`
 * — sem sessão de usuário. Anonimiza as contas com a carência LGPD vencida
 * (`deletionScheduledAt <= now`). Idempotente: `anonymizedAt` evita reprocessar;
 * contas de único proprietário de workspace são puladas até a transferência.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return handleError(forbidden("CRON_SECRET não configurado"));

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided !== secret) return handleError(unauthorized());

  const result = await accountDeletionTick();
  return successResponse(result);
}
