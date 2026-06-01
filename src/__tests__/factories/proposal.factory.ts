import { randomUUID } from "node:crypto";
import type { Prisma, Proposal } from "@prisma/client";

type ProposalOverrides = Partial<
  Omit<Prisma.ProposalCreateInput, "workspace" | "createdBy">
>;

/** Cria uma proposta real no banco de testes, escopada a workspace + criador. */
export async function createProposal(
  workspaceId: string,
  createdById: string,
  overrides: ProposalOverrides = {},
): Promise<Proposal> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.proposal.create({
    data: {
      title: overrides.title ?? "Proposta comercial",
      shareToken: overrides.shareToken ?? randomUUID().replace(/-/g, ""),
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
