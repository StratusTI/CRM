import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/src/lib/auth-session";
import { verifyOauthState } from "@/src/lib/social/oauth-state";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { SocialConnectionService } from "@/src/services/social-connection.service";

type RouteContext = {
  params: Promise<{ platform: string }>;
};

/**
 * Callback OAuth (path fixo — o provedor redireciona para cá). Conclui a conexão
 * e devolve o usuário para Settings com o status. O workspace vem do `state`
 * (decodificado aqui também, para conseguir redirecionar com o motivo em caso de
 * falha em vez de jogar o usuário para a home sem informação).
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { platform: platformSlug } = await params;
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Slug a partir do state (best-effort) para os redirects de erro.
  const decoded = state ? verifyOauthState(state) : null;
  const slug = decoded?.ok ? decoded.value.slug : null;

  const backToSettings = (status: string, reason?: string) => {
    if (!slug) return NextResponse.redirect(new URL("/", request.url));
    const target = new URL(`/${slug}/settings`, request.url);
    target.searchParams.set("social", platformSlug);
    target.searchParams.set("status", status);
    if (reason) target.searchParams.set("reason", reason);
    return NextResponse.redirect(target);
  };

  const session = await getAuthSession();
  if (!session.ok) {
    console.error("[social/callback] sem sessão no callback");
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const platform = parsePlatformSlug(platformSlug);
  if (!platform || !code || !state) {
    console.error("[social/callback] faltando platform/code/state", {
      platformSlug,
      hasCode: Boolean(code),
      hasState: Boolean(state),
    });
    return backToSettings("error", "SOCIAL_STATE_INVALID");
  }

  const result = await SocialConnectionService.completeConnect(
    session.value.user.id,
    { platform, code, state },
  );
  if (!result.ok) {
    console.error(
      "[social/callback] completeConnect falhou:",
      result.error.code,
      result.error.message,
    );
    return backToSettings("error", result.error.code);
  }

  return backToSettings("connected");
}
