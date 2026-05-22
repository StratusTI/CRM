import type { Dashboard } from "@prisma/client";
import { dashboardNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toDashboardDTO } from "@/src/mappers/dashboard.mapper";
import { DashboardRepository } from "@/src/repositories/dashboard.repository";
import type {
  CreateDashboardInput,
  DashboardDTO,
  UpdateDashboardInput,
} from "@/src/schemas/dashboard.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Dashboard>> {
  const found = await DashboardRepository.findById(id);
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

export const DashboardService = {
  async create(
    userId: string,
    slug: string,
    input: CreateDashboardInput,
  ): Promise<Result<DashboardDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const created = await DashboardRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      title: input.title,
      pageLayoutId: input.pageLayoutId ?? null,
    });
    if (!created.ok) return created;
    return ok(toDashboardDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<DashboardDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await DashboardRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toDashboardDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<DashboardDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const dashboard = await loadInWorkspace(ws.value, id);
    if (!dashboard.ok) return dashboard;
    return ok(toDashboardDTO(dashboard.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateDashboardInput,
  ): Promise<Result<DashboardDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const updated = await DashboardRepository.update(id, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    return ok(toDashboardDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<DashboardDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await DashboardRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toDashboardDTO(removed.value));
  },

  /** Persiste a ordem manual dos dashboards (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return DashboardRepository.reorder(ws.value, ids);
  },
};
