import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { CreateWorkflowSchema } from "@/src/schemas/workflow.schema";
import { WorkflowService } from "@/src/services/workflow.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);
  const { slug } = await params;
  const result = await WorkflowService.list(session.value.user.id, slug);
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);
  const body = await request.json().catch(() => null);
  const parsed = CreateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }
  const { slug } = await params;
  const result = await WorkflowService.create(
    session.value.user.id,
    slug,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value, 201);
}
