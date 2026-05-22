import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { AcceptConsentSchema } from "@/src/schemas/user.schema";
import { UserService } from "@/src/services/user.service";
import { handleError, successResponse } from "@/utils/http-response";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = AcceptConsentSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Consentimento inválido", z.flattenError(parsed.error)),
    );
  }

  const result = await UserService.acceptConsent(session.value.user.id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
