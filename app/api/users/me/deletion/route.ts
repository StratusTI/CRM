import { getAuthSession } from "@/src/lib/auth-session";
import { UserService } from "@/src/services/user.service";
import { handleError, successResponse } from "@/utils/http-response";

/** Agenda a exclusão da conta (carência LGPD). */
export async function POST() {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const result = await UserService.scheduleDeletion(session.value.user.id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}

/** Cancela uma exclusão agendada. */
export async function DELETE() {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const result = await UserService.cancelDeletion(session.value.user.id);
  if (!result.ok) return handleError(result.error);

  return successResponse(result.value);
}
