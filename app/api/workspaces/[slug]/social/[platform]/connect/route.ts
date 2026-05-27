import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withPublicUrl } from "@/lib/api-url";
import { getAuthSession } from "@/src/lib/auth-session";
import { parsePlatformSlug } from "@/src/schemas/social-connection.schema";
import { SocialConnectionService } from "@/src/services/social-connection.service";

type RouteContext = {
  params: Promise<{ slug: string; platform: string }>;
};

/**
 * Início do fluxo OAuth (navegação do browser). Redireciona (302) para a tela de
 * autorização do provedor. Falhas voltam para Settings com `?status=error` em vez
 * de JSON, pois quem chama é uma navegação, não fetch.
 *
 * `NextResponse.redirect()` em route handler não aplica basePath — usamos
 * `withPublicUrl()` para URLs internas que devem ser absolutas. Em URLs
 * externas (`authorizeUrl`) não.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug, platform: platformSlug } = await params;

  const session = await getAuthSession();
  if (!session.ok) {
    return NextResponse.redirect(withPublicUrl("/sign-in"));
  }

  const settingsUrl = withPublicUrl(`/${slug}/settings`);
  const platform = parsePlatformSlug(platformSlug);
  if (!platform) {
    settingsUrl.searchParams.set("status", "error");
    return NextResponse.redirect(settingsUrl);
  }

  const result = await SocialConnectionService.beginConnect(
    session.value.user.id,
    slug,
    platform,
  );
  if (!result.ok) {
    settingsUrl.searchParams.set("social", platformSlug);
    settingsUrl.searchParams.set("status", "error");
    settingsUrl.searchParams.set("reason", result.error.code);
    return NextResponse.redirect(settingsUrl);
  }

  return NextResponse.redirect(result.value.authorizeUrl);
}
