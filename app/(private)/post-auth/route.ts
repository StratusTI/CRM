import { redirect } from "next/navigation";
import { getAuthSession } from "@/src/lib/auth-session";
import { resolveWorkspacePath } from "@/src/lib/post-auth-redirect";

// Route Handler (não Page) porque `resolveWorkspacePath` consome a cookie
// `pending_invite` — e Server Components não podem mutar cookies. O destino
// é o mesmo: sign-in/sign-up (email + Google OAuth) e o pós-consent.
export async function GET(): Promise<never> {
  const session = await getAuthSession();

  if (!session.ok) {
    redirect("/sign-in");
  }

  const path = await resolveWorkspacePath(session.value.user.id);
  redirect(path);
}
