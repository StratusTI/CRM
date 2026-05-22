import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { CreateWorkspaceSchema } from "@/src/schemas/workspace.schema";
import { WorkspaceService } from "@/src/services/workspace.service";
import { handleError, successResponse } from "@/utils/http-response";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await WorkspaceService.create(
    session.value.user.id,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value, 201);
}

export async function GET() {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const result = await WorkspaceService.list(session.value.user.id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
