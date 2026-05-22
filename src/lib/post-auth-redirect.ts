import { MembershipRepository } from "@/src/repositories/membership.repository";

export const ONBOARDING_PATH = "/create-workspace";

/**
 * Decide para onde o usuário vai depois de autenticar:
 * - tem ao menos uma membership  → `/[workspace-slug]` (a mais antiga)
 * - não tem nenhuma (ou falha)    → fluxo de onboarding
 */
export async function resolveWorkspacePath(userId: string): Promise<string> {
  const result = await MembershipRepository.listByUser(userId);

  if (!result.ok || result.value.length === 0) {
    return ONBOARDING_PATH;
  }

  return `/${result.value[0].workspace.slug}`;
}
