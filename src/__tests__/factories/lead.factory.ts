import type { Lead, LeadStatus } from "@prisma/client";

type LeadOverrides = {
  name?: string;
  emails?: string[];
  phones?: string[];
  company?: string | null;
  jobTitle?: string | null;
  source?: string | null;
  status?: LeadStatus;
  score?: number;
  ownerId?: string | null;
};

/** Cria um lead real no banco de testes. */
export async function createLead(
  workspaceId: string,
  createdById: string,
  overrides: LeadOverrides = {},
): Promise<Lead> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.lead.create({
    data: {
      workspaceId,
      createdById,
      name: overrides.name ?? "Lead Teste",
      emails: overrides.emails ?? [],
      phones: overrides.phones ?? [],
      company: overrides.company ?? null,
      jobTitle: overrides.jobTitle ?? null,
      source: overrides.source ?? null,
      status: overrides.status ?? "NEW",
      score: overrides.score ?? 0,
      ownerId: overrides.ownerId ?? null,
    },
  });
}
