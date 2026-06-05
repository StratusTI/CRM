import type { Activity, ActivityAction, Prisma } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateActivityData = {
  workspaceId: string;
  actorUserId: string | null;
  action: ActivityAction;
  entity: string;
  entityId: string;
  companyId: string | null;
  personId: string | null;
  opportunityId: string | null;
  changedFields: string[];
  data: Prisma.InputJsonValue;
  summary: string | null;
};

export type AuditFilters = {
  entity?: string;
  actorUserId?: string;
  action?: ActivityAction;
  from?: Date;
  to?: Date;
  limit: number;
};

/** Acesso a dados de Activity. Append-only — só create e leitura. */
export const ActivityRepository = {
  async create(data: CreateActivityData): Promise<Result<Activity>> {
    try {
      const activity = await prisma.activity.create({ data });
      return ok(activity);
    } catch {
      return err(databaseError());
    }
  },

  /** Timeline de um registro: atividades onde ele é o company/person/opportunity. */
  async listByRecord(
    workspaceId: string,
    field: "companyId" | "personId" | "opportunityId",
    recordId: string,
    limit = 100,
  ): Promise<Result<Activity[]>> {
    try {
      const activities = await prisma.activity.findMany({
        where: { workspaceId, [field]: recordId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return ok(activities);
    } catch {
      return err(databaseError());
    }
  },

  /** Audit log: todas as atividades da workspace, com filtros opcionais. */
  async listByWorkspace(
    workspaceId: string,
    filters: AuditFilters,
  ): Promise<Result<Activity[]>> {
    try {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = filters.from;
      if (filters.to) createdAt.lte = filters.to;

      const activities = await prisma.activity.findMany({
        where: {
          workspaceId,
          ...(filters.entity && { entity: filters.entity }),
          ...(filters.actorUserId && { actorUserId: filters.actorUserId }),
          ...(filters.action && { action: filters.action }),
          ...((filters.from || filters.to) && { createdAt }),
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit,
      });
      return ok(activities);
    } catch {
      return err(databaseError());
    }
  },
};
