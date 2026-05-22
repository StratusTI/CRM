import { redirect } from "next/navigation";
import { getAuthSession } from "@/src/lib/auth-session";
import { resolveWorkspacePath } from "@/src/lib/post-auth-redirect";

/**
 * Destino comum após sign-in / sign-up (email e Google OAuth).
 * Resolve a workspace do usuário no servidor e redireciona.
 */
export default async function PostAuthPage() {
  const session = await getAuthSession();

  if (!session.ok) {
    redirect("/sign-in");
  }

  const path = await resolveWorkspacePath(session.value.user.id);
  redirect(path);
}
