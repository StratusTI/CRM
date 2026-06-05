import { forbidden, workspaceNotFound } from "@/src/errors/app-error";
import {
  can,
  type PermissionAction,
  type PermissionMap,
  SYSTEM_PROFILE_PERMISSIONS,
} from "@/src/lib/permissions";
import { err, ok, type Result } from "@/src/lib/result";
import { MembershipRepository } from "@/src/repositories/membership.repository";

export type WorkspaceAccess = {
  workspaceId: string;
  isOwner: boolean;
  /** Permissões efetivas, ou `null` quando não há perfil/papel determinável. */
  permissions: PermissionMap | null;
};

export type PermissionRequirement = {
  resource: string;
  action: PermissionAction;
};

/**
 * Resolve a workspace + permissões do usuário. Não-membros recebem
 * WORKSPACE_NOT_FOUND. As permissões vêm do perfil; na ausência dele, caem no
 * papel legado (OWNER/ADMIN/MEMBER); na ausência de ambos, ficam `null` (acesso
 * permitido — membro verificado, compat com dados/mosks antigos).
 */
export async function resolveWorkspaceAccess(
  userId: string,
  slug: string,
): Promise<Result<WorkspaceAccess>> {
  const membership = await MembershipRepository.findByUserAndSlug(userId, slug);
  if (!membership.ok) return membership;
  if (!membership.value) return err(workspaceNotFound());

  const m = membership.value;
  const profile = m.profile;
  const permissions: PermissionMap | null = profile
    ? (profile.permissions as PermissionMap)
    : m.role
      ? (SYSTEM_PROFILE_PERMISSIONS[m.role] ?? null)
      : null;
  const isOwner = profile?.systemKey === "OWNER" || m.role === "OWNER";

  return ok({ workspaceId: m.workspace.id, isOwner, permissions });
}

/**
 * Resolve o id da workspace garantindo associação. Quando `require` é informado,
 * também checa a permissão (recurso × ação) e retorna FORBIDDEN se negada.
 * Owners têm acesso total. Mesmo contrato usado por todas as features escopadas.
 */
export async function resolveWorkspaceId(
  userId: string,
  slug: string,
  require?: PermissionRequirement,
): Promise<Result<string>> {
  const access = await resolveWorkspaceAccess(userId, slug);
  if (!access.ok) return access;

  if (require && !access.value.isOwner) {
    const perms = access.value.permissions;
    // `null` = não determinável → permite (membro verificado). Caso contrário,
    // exige a permissão explícita.
    if (perms && !can(perms, require.resource, require.action)) {
      return err(forbidden());
    }
  }

  return ok(access.value.workspaceId);
}

/**
 * Resolve o id da workspace exigindo que o usuário seja **OWNER**. Mais estrito
 * que o RBAC (ADMIN não passa). Usado por pagamentos/assinatura, visíveis só ao
 * proprietário. Não-membros recebem WORKSPACE_NOT_FOUND; demais, FORBIDDEN.
 */
export async function resolveOwnerWorkspaceId(
  userId: string,
  slug: string,
): Promise<Result<string>> {
  const access = await resolveWorkspaceAccess(userId, slug);
  if (!access.ok) return access;
  if (!access.value.isOwner) return err(forbidden());
  return ok(access.value.workspaceId);
}
