import { randomBytes } from "node:crypto";
import type { Role, WorkspaceInvite } from "@prisma/client";

type WorkspaceInviteOverrides = {
  token?: string;
  role?: Role;
  isActive?: boolean;
};

/** Token opaco curto para uso em testes (não-criptográfico vale aqui). */
function makeToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Cria um convite real no banco de testes ligado a uma workspace existente. */
export async function createWorkspaceInvite(
  workspaceId: string,
  createdById: string,
  overrides: WorkspaceInviteOverrides = {},
): Promise<WorkspaceInvite> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.workspaceInvite.create({
    data: {
      workspaceId,
      createdById,
      token: overrides.token ?? makeToken(),
      role: overrides.role ?? "MEMBER",
      isActive: overrides.isActive ?? true,
    },
  });
}
