import type { Dashboard } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateDashboardData = {
  workspaceId: string;
  createdById: string;
  title: string;
  pageLayoutId: string | null;
};

export type UpdateDashboardData = {
  updatedById: string;
  title?: string;
  pageLayoutId?: string | null;
};

/** Acesso a dados de dashboard. Sem regra de negócio — só Prisma. */
export const DashboardRepository = {
  async create(data: CreateDashboardData): Promise<Result<Dashboard>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const dashboard = await prisma.dashboard.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(dashboard);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Dashboard | null>> {
    try {
      const dashboard = await prisma.dashboard.findUnique({ where: { id } });
      return ok(dashboard);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Dashboard[]>> {
    try {
      const dashboards = await prisma.dashboard.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(dashboards);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.dashboard.updateMany({
            where: { id, workspaceId, deletedAt: null },
            data: { position: index + 1 },
          }),
        ),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: UpdateDashboardData,
  ): Promise<Result<Dashboard>> {
    try {
      const dashboard = await prisma.dashboard.update({ where: { id }, data });
      return ok(dashboard);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<Dashboard>> {
    try {
      const dashboard = await prisma.dashboard.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(dashboard);
    } catch {
      return err(databaseError());
    }
  },
};
