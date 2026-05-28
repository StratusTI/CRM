import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/src/errors/app-error";
import { workflowSchedulerTick } from "@/src/services/workflow-scheduler";
import { handleError, successResponse } from "@/utils/http-response";

/**
 * Endpoint chamado pelo cron do sistema (1x por minuto). Auth via header
 * `Authorization: Bearer $CRON_SECRET` — sem sessão de usuário.
 *
 * Resposta: contagem de triggers considerados, runs disparadas e erros.
 * Idempotente: o scheduler usa `workflow.lastRunAt` pra evitar disparo duplo
 * se o cron rodar duas vezes no mesmo minuto.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return handleError(forbidden("CRON_SECRET não configurado"));

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided !== secret) return handleError(unauthorized());

  const result = await workflowSchedulerTick();
  return successResponse(result);
}
