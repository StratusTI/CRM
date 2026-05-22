import type { DashboardWidget, Prisma, WidgetType } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateWidgetData = {
  dashboardId: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Prisma.InputJsonValue;
};

export type UpdateWidgetData = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  config?: Prisma.InputJsonValue;
};

/** Acesso a dados dos widgets de dashboard. Sem regra de negócio — só Prisma. */
export const DashboardWidgetRepository = {
  async create(data: CreateWidgetData): Promise<Result<DashboardWidget>> {
    try {
      const widget = await prisma.dashboardWidget.create({ data });
      return ok(widget);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<DashboardWidget | null>> {
    try {
      const widget = await prisma.dashboardWidget.findUnique({ where: { id } });
      return ok(widget);
    } catch {
      return err(databaseError());
    }
  },

  async listByDashboard(
    dashboardId: string,
  ): Promise<Result<DashboardWidget[]>> {
    try {
      const widgets = await prisma.dashboardWidget.findMany({
        where: { dashboardId },
        orderBy: { createdAt: "asc" },
      });
      return ok(widgets);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: UpdateWidgetData,
  ): Promise<Result<DashboardWidget>> {
    try {
      const widget = await prisma.dashboardWidget.update({
        where: { id },
        data,
      });
      return ok(widget);
    } catch {
      return err(databaseError());
    }
  },

  async remove(id: string): Promise<Result<DashboardWidget>> {
    try {
      const widget = await prisma.dashboardWidget.delete({ where: { id } });
      return ok(widget);
    } catch {
      return err(databaseError());
    }
  },

  /** Atualiza posição/tamanho de vários widgets de um dashboard numa transação. */
  async applyLayout(
    dashboardId: string,
    items: { id: string; x: number; y: number; w: number; h: number }[],
  ): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        items.map((item) =>
          prisma.dashboardWidget.updateMany({
            where: { id: item.id, dashboardId },
            data: { x: item.x, y: item.y, w: item.w, h: item.h },
          }),
        ),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },
};
