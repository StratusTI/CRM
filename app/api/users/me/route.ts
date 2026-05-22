import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { UpdateProfileSchema } from "@/src/schemas/user.schema";
import { UserService } from "@/src/services/user.service";
import { handleError, successResponse } from "@/utils/http-response";

export async function GET() {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const result = await UserService.getMe(session.value.user.id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const result = await UserService.updateProfile(
    session.value.user.id,
    parsed.data,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
