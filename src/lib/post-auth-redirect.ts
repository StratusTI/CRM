import {
  clearPendingInvite,
  readPendingInvite,
} from "@/src/lib/pending-invite";
import { MembershipRepository } from "@/src/repositories/membership.repository";

export const ONBOARDING_PATH = "/create-workspace";

/**
 * Decide para onde o usuário vai depois de autenticar:
 * - há uma cookie `pending_invite`  → `/invite/<token>` (consome a cookie)
 * - tem ao menos uma membership     → `/[workspace-slug]` (a mais antiga)
 * - não tem nenhuma (ou falha)      → fluxo de onboarding
 */
export async function resolveWorkspacePath(userId: string): Promise<string> {
  const pending = await readPendingInvite();
  if (pending) {
    await clearPendingInvite();
    return `/invite/${pending}`;
  }

  const result = await MembershipRepository.listByUser(userId);

  if (!result.ok || result.value.length === 0) {
    return ONBOARDING_PATH;
  }

  return `/${result.value[0].workspace.slug}`;
}
