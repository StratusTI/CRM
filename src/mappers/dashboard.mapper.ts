import type { Dashboard } from "@prisma/client";
import type { DashboardDTO } from "@/src/schemas/dashboard.schema";

/** `Prisma.Dashboard` → `DashboardDTO` (datas em ISO). */
export function toDashboardDTO(dashboard: Dashboard): DashboardDTO {
  return {
    id: dashboard.id,
    title: dashboard.title,
    pageLayoutId: dashboard.pageLayoutId,
    workspaceId: dashboard.workspaceId,
    createdById: dashboard.createdById,
    updatedById: dashboard.updatedById,
    createdAt: dashboard.createdAt.toISOString(),
    updatedAt: dashboard.updatedAt.toISOString(),
    deletedAt:
      dashboard.deletedAt === null ? null : dashboard.deletedAt.toISOString(),
  };
}
