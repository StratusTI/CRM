import { randomUUID } from "node:crypto";
import type { Role, Workspace } from "@prisma/client";

type WorkspaceOverrides = {
  name?: string;
  slug?: string;
};

/** Cria uma workspace real e a membership do dono no banco de testes. */
export async function createWorkspaceWithOwner(
  ownerId: string,
  overrides: WorkspaceOverrides = {},
  role: Role = "OWNER",
): Promise<Workspace> {
  const { prisma } = await import("@/src/lib/prisma");
  const suffix = randomUUID().slice(0, 8);
  return prisma.workspace.create({
    data: {
      name: overrides.name ?? "Test Workspace",
      slug: overrides.slug ?? `ws-${suffix}`,
      memberships: { create: { userId: ownerId, role } },
    },
  });
}
