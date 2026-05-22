import type { DashboardWidget } from "@prisma/client";
import type { DashboardWidgetDTO } from "@/src/schemas/dashboard-widget.schema";

/** `Prisma.DashboardWidget` → `DashboardWidgetDTO` (datas em ISO). */
export function toDashboardWidgetDTO(
  widget: DashboardWidget,
): DashboardWidgetDTO {
  return {
    id: widget.id,
    dashboardId: widget.dashboardId,
    type: widget.type,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    config: widget.config,
    createdAt: widget.createdAt.toISOString(),
    updatedAt: widget.updatedAt.toISOString(),
  };
}
