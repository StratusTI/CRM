import { cookies } from "next/headers";
import { NODE_ENV } from "@/lib/env/env";

/**
 * Cookie usada pra carregar o token do convite através do fluxo de auth:
 *
 *   /invite/<token>  → stash → /sign-in (ou /sign-up → /consent) → /post-auth
 *
 * Em /post-auth `resolveWorkspacePath` lê e consome essa cookie pra
 * redirecionar de volta à tela de aceitar. Cookie httpOnly + sameSite=lax pra
 * sobreviver ao redirect do Google OAuth.
 */
export const PENDING_INVITE_COOKIE = "pending_invite";
const MAX_AGE_SECONDS = 60 * 60;

export async function stashPendingInvite(token: string): Promise<void> {
  const store = await cookies();
  store.set(PENDING_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readPendingInvite(): Promise<string | null> {
  const store = await cookies();
  return store.get(PENDING_INVITE_COOKIE)?.value ?? null;
}

export async function clearPendingInvite(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_INVITE_COOKIE);
}
