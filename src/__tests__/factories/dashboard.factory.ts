import type { Dashboard, Prisma } from "@prisma/client";

type DashboardOverrides = Partial<
  Omit<Prisma.DashboardCreateInput, "workspace" | "createdBy">
>;

/** Cria um dashboard real no banco de testes, escopado a workspace + criador. */
export async function createDashboard(
  workspaceId: string,
  createdById: string,
  overrides: DashboardOverrides = {},
): Promise<Dashboard> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.dashboard.create({
    data: {
      title: overrides.title ?? "Visão geral",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
