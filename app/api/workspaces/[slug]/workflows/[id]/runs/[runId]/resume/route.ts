import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { ResumeRunSchema } from "@/src/schemas/workflow.schema";
import { WorkflowService } from "@/src/services/workflow.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string; id: string; runId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);
  const body = await request.json().catch(() => ({}));
  const parsed = ResumeRunSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }
  const { slug, id, runId } = await params;
  const result = await WorkflowService.resumeRun(
    session.value.user.id,
    slug,
    id,
    runId,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);
  return successResponse(result.value);
}
