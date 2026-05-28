import type { NextRequest } from "next/server";
import { WorkflowService } from "@/src/services/workflow.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Endpoint público — sem auth. A posse vem do `token` opaco emitido pelo
 * trigger. `triggerWebhook` falha com WORKFLOW_WEBHOOK_INVALID se o token
 * não bater ou o workflow não estiver ACTIVE.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await WorkflowService.triggerWebhook(token, body);
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value, 202);
}
