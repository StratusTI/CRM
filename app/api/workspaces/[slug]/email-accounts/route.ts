import type { NextRequest } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { EmailAccountService } from "@/src/services/email-account.service";
import { handleError, successResponse } from "@/utils/http-response";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/** Lista as contas de e-mail conectadas do usuário na workspace. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const { slug } = await params;
  const result = await EmailAccountService.list(session.value.user.id, slug);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
