import { getAuthSession } from "@/src/lib/auth-session";
import { UserService } from "@/src/services/user.service";
import { handleError } from "@/utils/http-response";

/** Exporta os dados pessoais do titular (portabilidade LGPD) como download JSON. */
export async function GET() {
  const session = await getAuthSession();
  if (!session.ok) return handleError(session.error);

  const result = await UserService.exportData(session.value.user.id);
  if (!result.ok) return handleError(result.error);

  const body = JSON.stringify(result.value, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados.json"',
    },
  });
}
