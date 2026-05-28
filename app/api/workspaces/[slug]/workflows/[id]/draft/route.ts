import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { UpdateWorkflowDraftSchema } from "@/src/schemas/workflow.schema";
import { WorkflowService } from "@/src/services/workflow.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);
  const { slug, id } = await params;
  const result = await WorkflowService.getDraft(
    session.value.user.id,
    slug,
    id,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);
  const body = await request.json().catch(() => null);
  const parsed = UpdateWorkflowDraftSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Definição inválida", z.flattenError(parsed.error)),
    );
  }
  const { slug, id } = await params;
  const result = await WorkflowService.updateDraft(
    session.value.user.id,
    slug,
    id,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}
