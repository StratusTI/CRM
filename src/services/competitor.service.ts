import type { TrackedCompetitor } from "@prisma/client";
import { competitorNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toCompetitorDTO } from "@/src/mappers/competitor.mapper";
import { CompetitorRepository } from "@/src/repositories/competitor.repository";
import type {
  CompetitorDTO,
  CreateCompetitorInput,
  UpdateCompetitorInput,
} from "@/src/schemas/competitor.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<TrackedCompetitor>> {
  const found = await CompetitorRepository.findById(id);
  if (!found.ok) return found;
  const competitor = found.value;
  if (
    !competitor ||
    competitor.workspaceId !== workspaceId ||
    competitor.deletedAt
  ) {
    return err(competitorNotFound());
  }
  return ok(competitor);
}

export const CompetitorService = {
  async create(
    userId: string,
    slug: string,
    input: CreateCompetitorInput,
  ): Promise<Result<CompetitorDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const created = await CompetitorRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      platform: input.platform,
      handle: input.handle,
      profileUrl: input.profileUrl ?? null,
      followersCount: input.followersCount ?? null,
      notes: input.notes ?? null,
    });
    if (!created.ok) return created;
    return ok(toCompetitorDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<CompetitorDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await CompetitorRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toCompetitorDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<CompetitorDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const competitor = await loadInWorkspace(ws.value, id);
    if (!competitor.ok) return competitor;
    return ok(toCompetitorDTO(competitor.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateCompetitorInput,
  ): Promise<Result<CompetitorDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const updated = await CompetitorRepository.update(id, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    return ok(toCompetitorDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<CompetitorDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await CompetitorRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toCompetitorDTO(removed.value));
  },

  /** Persiste a ordem manual dos concorrentes (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return CompetitorRepository.reorder(ws.value, ids);
  },
};
