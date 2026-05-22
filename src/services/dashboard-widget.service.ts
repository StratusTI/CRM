import type { Dashboard, DashboardWidget, Prisma } from "@prisma/client";
import {
  dashboardNotFound,
  dashboardWidgetNotFound,
  validationError,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toDashboardWidgetDTO } from "@/src/mappers/dashboard-widget.mapper";
import { DashboardRepository } from "@/src/repositories/dashboard.repository";
import { DashboardWidgetRepository } from "@/src/repositories/dashboard-widget.repository";
import {
  type CreateWidgetInput,
  type DashboardWidgetDTO,
  type UpdateWidgetInput,
  type WidgetLayoutBatchInput,
  widgetConfigSchema,
} from "@/src/schemas/dashboard-widget.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Garante que o dashboard existe e pertence ao workspace do usuário. */
async function loadDashboard(
  workspaceId: string,
  dashboardId: string,
): Promise<Result<Dashboard>> {
  const found = await DashboardRepository.findById(dashboardId);
  if (!found.ok) return found;
  const dashboard = found.value;
  if (
    !dashboard ||
    dashboard.workspaceId !== workspaceId ||
    dashboard.deletedAt
  ) {
    return err(dashboardNotFound());
  }
  return ok(dashboard);
}

/** Carrega um widget garantindo que ele pertence ao dashboard informado. */
async function loadWidget(
  dashboardId: string,
  widgetId: string,
): Promise<Result<DashboardWidget>> {
  const found = await DashboardWidgetRepository.findById(widgetId);
  if (!found.ok) return found;
  const widget = found.value;
  if (!widget || widget.dashboardId !== dashboardId) {
    return err(dashboardWidgetNotFound());
  }
  return ok(widget);
}

export const DashboardWidgetService = {
  async list(
    userId: string,
    slug: string,
    dashboardId: string,
  ): Promise<Result<DashboardWidgetDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const dashboard = await loadDashboard(ws.value, dashboardId);
    if (!dashboard.ok) return dashboard;

    const result = await DashboardWidgetRepository.listByDashboard(dashboardId);
    if (!result.ok) return result;
    return ok(result.value.map(toDashboardWidgetDTO));
  },

  async create(
    userId: string,
    slug: string,
    dashboardId: string,
    input: CreateWidgetInput,
  ): Promise<Result<DashboardWidgetDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const dashboard = await loadDashboard(ws.value, dashboardId);
    if (!dashboard.ok) return dashboard;

    const created = await DashboardWidgetRepository.create({
      dashboardId,
      type: input.type,
      x: input.x,
      y: input.y,
      w: input.w,
      h: input.h,
      config: input.config as Prisma.InputJsonValue,
    });
    if (!created.ok) return created;
    return ok(toDashboardWidgetDTO(created.value));
  },

  async update(
    userId: string,
    slug: string,
    dashboardId: string,
    widgetId: string,
    input: UpdateWidgetInput,
  ): Promise<Result<DashboardWidgetDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const dashboard = await loadDashboard(ws.value, dashboardId);
    if (!dashboard.ok) return dashboard;
    const existing = await loadWidget(dashboardId, widgetId);
    if (!existing.ok) return existing;

    const data: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      config?: Prisma.InputJsonValue;
    } = {};
    if (input.x !== undefined) data.x = input.x;
    if (input.y !== undefined) data.y = input.y;
    if (input.w !== undefined) data.w = input.w;
    if (input.h !== undefined) data.h = input.h;

    // `config` é validado contra o tipo do widget existente.
    if (input.config !== undefined) {
      const parsed = widgetConfigSchema(existing.value.type).safeParse(
        input.config,
      );
      if (!parsed.success) {
        return err(validationError("Configuração inválida do widget"));
      }
      data.config = parsed.data as Prisma.InputJsonValue;
    }

    const updated = await DashboardWidgetRepository.update(widgetId, data);
    if (!updated.ok) return updated;
    return ok(toDashboardWidgetDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    dashboardId: string,
    widgetId: string,
  ): Promise<Result<DashboardWidgetDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const dashboard = await loadDashboard(ws.value, dashboardId);
    if (!dashboard.ok) return dashboard;
    const existing = await loadWidget(dashboardId, widgetId);
    if (!existing.ok) return existing;

    const removed = await DashboardWidgetRepository.remove(widgetId);
    if (!removed.ok) return removed;
    return ok(toDashboardWidgetDTO(removed.value));
  },

  /** Persiste posições/tamanhos após drag/resize no grid. */
  async applyLayout(
    userId: string,
    slug: string,
    dashboardId: string,
    input: WidgetLayoutBatchInput,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const dashboard = await loadDashboard(ws.value, dashboardId);
    if (!dashboard.ok) return dashboard;

    return DashboardWidgetRepository.applyLayout(dashboardId, input.items);
  },
};
