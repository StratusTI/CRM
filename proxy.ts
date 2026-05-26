import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { NODE_ENV } from "./lib/env/env";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forget-password",
  "/reset-password",
  "/invite",
  "/api/auth",
  "/api/invites",
  "/api/status",
  "/api/payment/webhook",
  "/docs",
  "/legals",
  "/status",
  "/plan",
];

// Rotas de primeiro nível que NÃO são slugs de workspace. Qualquer outro
// caminho de segmento único (`/<slug>`) é a home da workspace e redireciona
// para `/<slug>/companies`.
const RESERVED_TOP_LEVEL = new Set([
  "api",
  "consent",
  "create-workspace",
  "invite",
  "onboarding",
  "post-auth",
  "reference",
  "sign-in",
  "sign-up",
  "forget-password",
  "reset-password",
  "docs",
  "legals",
  "status",
  "plan",
  "contact",
  "testes",
]);

/** `/<slug>` (segmento único, não reservado, não arquivo) → home da workspace. */
function workspaceHomeRedirect(request: NextRequest): NextResponse | null {
  if (request.method !== "GET") return null;
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = segments[0];
  if (RESERVED_TOP_LEVEL.has(slug) || slug.includes(".")) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/${slug}/companies`;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (
    NODE_ENV === "development" &&
    (pathname === "/reference" ||
      pathname === "/openapi.json" ||
      pathname === "/contact" ||
      pathname === "/testes")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    // API routes should return 401, not redirect to the sign-in page.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, statusCode: 401, error: { code: "UNAUTHORIZED" } },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Autenticado: a home da workspace é a tabela de companies, então o slug
  // "pelado" (`/<slug>`) nunca é renderizado — redireciona antes.
  const homeRedirect = workspaceHomeRedirect(request);
  if (homeRedirect) return homeRedirect;

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
