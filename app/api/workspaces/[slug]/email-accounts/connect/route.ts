import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationError } from "@/src/errors/app-error";
import { getAuthSession } from "@/src/lib/auth-session";
import { EmailAccountService } from "@/src/services/email-account.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const ConnectSchema = z.object({
  provider: z.enum(["GOOGLE", "MICROSOFT"]),
});

/** Inicia o OAuth de e-mail/calendário; devolve a URL de autorização. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const body = await request.json().catch(() => null);
  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    return handleError(
      validationError("Dados inválidos", z.flattenError(parsed.error)),
    );
  }

  const { slug } = await params;
  const result = await EmailAccountService.beginConnect(
    session.value.user.id,
    slug,
    parsed.data.provider,
  );
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
