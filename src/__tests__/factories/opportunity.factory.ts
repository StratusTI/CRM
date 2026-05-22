import type { Opportunity, Prisma } from "@prisma/client";

type OpportunityOverrides = Partial<
  Omit<Prisma.OpportunityCreateInput, "workspace" | "createdBy">
>;

/** Cria uma oportunidade real no banco de testes, escopada a workspace + criador. */
export async function createOpportunity(
  workspaceId: string,
  createdById: string,
  overrides: OpportunityOverrides = {},
): Promise<Opportunity> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.opportunity.create({
    data: {
      name: overrides.name ?? "Big Deal",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
