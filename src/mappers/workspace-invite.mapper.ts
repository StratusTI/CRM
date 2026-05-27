import type { WorkspaceInvite } from "@prisma/client";
import type { WorkspaceInviteWithWorkspace } from "@/src/repositories/workspace-invite.repository";
import type {
  PublicInviteDTO,
  WorkspaceInviteDTO,
  WorkspaceInviteRole,
} from "@/src/schemas/workspace-invite.schema";

/** Restringe o role do Prisma (que inclui OWNER) ao subset válido pro convite. */
function toInviteRole(role: WorkspaceInvite["role"]): WorkspaceInviteRole {
  // OWNER nunca deveria estar gravado (service valida na escrita),
  // mas se chegar aqui, degrada para MEMBER em vez de explodir.
  return role === "ADMIN" ? "ADMIN" : "MEMBER";
}

/** DTO admin (settings): expõe token + isActive + URL absoluta. */
export function toWorkspaceInviteDTO(
  invite: WorkspaceInvite,
  origin: string,
): WorkspaceInviteDTO {
  // Garante que o origin não tenha barra no final antes de concatenar.
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return {
    token: invite.token,
    role: toInviteRole(invite.role),
    isActive: invite.isActive,
    url: `${base}/invite/${invite.token}`,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
  };
}

/** DTO público (tela de aceitar): só nome/slug/role; nunca token nem isActive. */
export function toPublicInviteDTO(
  invite: WorkspaceInviteWithWorkspace,
): PublicInviteDTO {
  return {
    workspaceName: invite.workspace.name,
    workspaceSlug: invite.workspace.slug,
    role: toInviteRole(invite.role),
  };
}
