import {
  pipelineDefaultProtected,
  pipelineInUse,
  pipelineNotFound,
  pipelineStageInUse,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toPipelineDTO } from "@/src/mappers/pipeline.mapper";
import {
  PipelineRepository,
  type PipelineWithStages,
  type StageData,
} from "@/src/repositories/pipeline.repository";
import type {
  CreatePipelineInput,
  PipelineDTO,
  StageInput,
  UpdatePipelineInput,
} from "@/src/schemas/pipeline.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

function toStageData(stage: StageInput): StageData {
  return {
    id: stage.id,
    name: stage.name,
    probability: stage.probability,
    category: stage.category,
    color: stage.color ?? null,
  };
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<PipelineWithStages>> {
  const found = await PipelineRepository.findById(id);
  if (!found.ok) return found;
  const pipeline = found.value;
  if (!pipeline || pipeline.workspaceId !== workspaceId || pipeline.deletedAt) {
    return err(pipelineNotFound());
  }
  return ok(pipeline);
}

export const PipelineService = {
  async list(userId: string, slug: string): Promise<Result<PipelineDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "pipelines",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await PipelineRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toPipelineDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<PipelineDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "pipelines",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const pipeline = await loadInWorkspace(ws.value, id);
    if (!pipeline.ok) return pipeline;
    return ok(toPipelineDTO(pipeline.value));
  },

  async create(
    userId: string,
    slug: string,
    input: CreatePipelineInput,
  ): Promise<Result<PipelineDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "pipelines",
      action: "CREATE",
    });
    if (!ws.ok) return ws;
    const created = await PipelineRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      stages: input.stages.map(toStageData),
    });
    if (!created.ok) return created;
    return ok(toPipelineDTO(created.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdatePipelineInput,
  ): Promise<Result<PipelineDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "pipelines",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    let removedStageIds: string[] | undefined;
    if (input.stages) {
      const incomingIds = new Set(
        input.stages.map((s) => s.id).filter((v): v is string => Boolean(v)),
      );
      removedStageIds = existing.value.stages
        .map((s) => s.id)
        .filter((id) => !incomingIds.has(id));

      if (removedStageIds.length > 0) {
        const inUse = await PipelineRepository.stagesInUse(removedStageIds);
        if (!inUse.ok) return inUse;
        if (inUse.value.length > 0) return err(pipelineStageInUse());
      }
    }

    const updated = await PipelineRepository.update(id, {
      updatedById: userId,
      name: input.name,
      stages: input.stages?.map(toStageData),
      removedStageIds,
    });
    if (!updated.ok) return updated;
    return ok(toPipelineDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<PipelineDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "pipelines",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    if (existing.value.isDefault) return err(pipelineDefaultProtected());

    const count = await PipelineRepository.countOpportunities(id);
    if (!count.ok) return count;
    if (count.value > 0) return err(pipelineInUse());

    const removed = await PipelineRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toPipelineDTO(existing.value));
  },

  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "pipelines",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return PipelineRepository.reorder(ws.value, ids);
  },

  /**
   * Resolve o pipeline + etapa inicial padrão da workspace (etapa OPEN de menor
   * posição, ou a primeira). Usado ao criar oportunidades sem etapa explícita
   * (lead-ingest, formulários, criação direta sem escolha).
   */
  async resolveDefaultStage(
    workspaceId: string,
  ): Promise<Result<{ pipelineId: string; stageId: string }>> {
    const def = await PipelineRepository.findDefault(workspaceId);
    if (!def.ok) return def;
    let pipeline = def.value;
    if (!pipeline) {
      const all = await PipelineRepository.listByWorkspace(workspaceId);
      if (!all.ok) return all;
      pipeline = all.value[0] ?? null;
    }
    if (!pipeline || pipeline.stages.length === 0) {
      return err(pipelineNotFound());
    }
    const ordered = [...pipeline.stages].sort(
      (a, b) => a.position - b.position,
    );
    const stage = ordered.find((s) => s.category === "OPEN") ?? ordered[0];
    return ok({ pipelineId: pipeline.id, stageId: stage.id });
  },
};
