import type { Quota, QuotaPeriod } from "@prisma/client";

type QuotaOverrides = {
  period?: QuotaPeriod;
  periodKey?: string;
  targetAmount?: number;
};

/** Cria uma meta real no banco de testes, escopada a workspace + responsável. */
export async function createQuota(
  workspaceId: string,
  ownerId: string,
  createdById: string,
  overrides: QuotaOverrides = {},
): Promise<Quota> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.quota.create({
    data: {
      period: overrides.period ?? "MONTH",
      periodKey: overrides.periodKey ?? "2026-06",
      targetAmount: overrides.targetAmount ?? 10000,
      workspace: { connect: { id: workspaceId } },
      owner: { connect: { id: ownerId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
