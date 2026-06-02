import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/src/errors/app-error";
import { socialPostSchedulerTick } from "@/src/services/social-post-scheduler";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Endpoint chamado pelo cron do sistema (1x por minuto). Auth via header
 * `Authorization: Bearer $CRON_SECRET` — sem sessão de usuário.
 *
 * Publica os posts agendados que já venceram. Idempotente: o scheduler
 * "reivindica" cada post (SCHEDULED→PUBLISHING) antes de publicar, então
 * rodar duas vezes no mesmo minuto não duplica publicações.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return handleError(forbidden("CRON_SECRET não configurado"));

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided !== secret) return handleError(unauthorized());

  const result = await socialPostSchedulerTick();
  return successResponse(result);
}
