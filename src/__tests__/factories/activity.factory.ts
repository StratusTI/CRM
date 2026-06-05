import type { Activity, ActivityAction } from "@prisma/client";

type ActivityOverrides = {
  actorUserId?: string | null;
  action?: ActivityAction;
  entity?: string;
  entityId?: string;
  companyId?: string | null;
  personId?: string | null;
  opportunityId?: string | null;
  changedFields?: string[];
  summary?: string | null;
};

/** Cria uma Activity real no banco de testes. */
export async function createActivity(
  workspaceId: string,
  overrides: ActivityOverrides = {},
): Promise<Activity> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.activity.create({
    data: {
      workspaceId,
      actorUserId: overrides.actorUserId ?? null,
      action: overrides.action ?? "CREATED",
      entity: overrides.entity ?? "company",
      entityId: overrides.entityId ?? "rec_1",
      companyId: overrides.companyId ?? null,
      personId: overrides.personId ?? null,
      opportunityId: overrides.opportunityId ?? null,
      changedFields: overrides.changedFields ?? [],
      data: {},
      summary: overrides.summary ?? null,
    },
  });
}
