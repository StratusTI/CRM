import { workspaceNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { MembershipRepository } from "@/src/repositories/membership.repository";

/**
 * Resolve o id do workspace pelo slug garantindo que o usuário seja membro.
 * Não-membros recebem WORKSPACE_NOT_FOUND (não vazamos existência) — mesmo
 * contrato usado por todas as features escopadas por workspace.
 */
export async function resolveWorkspaceId(
  userId: string,
  slug: string,
): Promise<Result<string>> {
  const membership = await MembershipRepository.findByUserAndSlug(userId, slug);
  if (!membership.ok) return membership;
  if (!membership.value) return err(workspaceNotFound());
  return ok(membership.value.workspace.id);
}
