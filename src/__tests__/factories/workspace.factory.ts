import { randomUUID } from "node:crypto";
import type { Role, Workspace } from "@prisma/client";

type WorkspaceOverrides = {
  name?: string;
  slug?: string;
};

/**
 * Cria uma workspace real e a membership do dono no banco de testes. Já semeia
 * o pipeline "Padrão" (com etapas) como em produção, para que oportunidades
 * criadas sem etapa explícita resolvam a etapa inicial.
 */
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
      pipelines: {
        create: {
          name: "Padrão",
          isDefault: true,
          position: 1,
          createdBy: { connect: { id: ownerId } },
          stages: {
            create: [
              { name: "Novo", probability: 10, category: "OPEN", position: 1 },
              {
                name: "Qualificado",
                probability: 25,
                category: "OPEN",
                position: 2,
              },
              { name: "Ganho", probability: 100, category: "WON", position: 3 },
              {
                name: "Perdido",
                probability: 0,
                category: "LOST",
                position: 4,
              },
            ],
          },
        },
      },
    },
  });
}
