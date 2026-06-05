import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withPublicUrl } from "@/lib/api-url";
import { getAuthSession } from "@/src/lib/auth-session";
import { EmailAccountService } from "@/src/services/email-account.service";

/**
 * Callback OAuth de e-mail/calendário (path fixo — o provedor redireciona aqui).
 * Conclui a conexão e devolve o usuário às Configurações com o status.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const session = await getAuthSession();
  if (!session.ok) {
    return NextResponse.redirect(withPublicUrl("/sign-in"));
  }

  if (!code || !state) {
    return NextResponse.redirect(withPublicUrl("/"));
  }

  const result = await EmailAccountService.completeConnect(
    session.value.user.id,
    { code, state },
  );

  if (!result.ok) {
    const target = withPublicUrl("/");
    return NextResponse.redirect(target);
  }

  const target = withPublicUrl(`/${result.value.slug}/settings`);
  target.searchParams.set("email", "connected");
  return NextResponse.redirect(target);
}
