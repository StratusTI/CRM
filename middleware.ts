import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { NODE_ENV } from "./lib/env/env";

// `basePath` é build-time (inlineado pelo Next). Em proxy/middleware, o
// `nextUrl.clone()` deveria preservar — mas na prática a Location header sai
// sem o prefixo. Concatenamos manualmente pra garantir.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
  "/api/cron",
  "/api/workflows/webhook",
  "/p",
  "/api/p",
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
  "p",
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
function workspaceHomeRedirect(
  request: NextRequest,
  pathname: string,
): NextResponse | null {
  if (request.method !== "GET") return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = segments[0];
  if (RESERVED_TOP_LEVEL.has(slug) || slug.includes(".")) return null;

  return NextResponse.redirect(
    new URL(`${BASE_PATH}/${slug}/companies`, request.url),
  );
}

export function middleware(request: NextRequest, _event: NextFetchEvent) {
  // Dependendo da versão/setup do Next, `nextUrl.pathname` pode ou não vir
  // com basePath strippado. Normalizamos manualmente.
  const rawPathname = request.nextUrl.pathname;
  const pathname =
    BASE_PATH && rawPathname.startsWith(BASE_PATH)
      ? rawPathname.slice(BASE_PATH.length) || "/"
      : rawPathname;

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
    const signInUrl = new URL(`${BASE_PATH}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Autenticado: a home da workspace é a tabela de companies, então o slug
  // "pelado" (`/<slug>`) nunca é renderizado — redireciona antes.
  const homeRedirect = workspaceHomeRedirect(request, pathname);
  if (homeRedirect) return homeRedirect;

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
