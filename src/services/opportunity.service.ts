import type { Opportunity } from "@prisma/client";
import {
  badRequest,
  companyNotFound,
  opportunityNotFound,
  personNotFound,
  pipelineNotFound,
  pipelineStageNotFound,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toOpportunityDTO } from "@/src/mappers/opportunity.mapper";
import { CompanyRepository } from "@/src/repositories/company.repository";
import {
  OpportunityRepository,
  type UpdateOpportunityData,
} from "@/src/repositories/opportunity.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import { PipelineRepository } from "@/src/repositories/pipeline.repository";
import type {
  CreateOpportunityInput,
  OpportunityDTO,
  UpdateOpportunityInput,
} from "@/src/schemas/opportunity.schema";
import {
  applyCustomFieldValues,
  withCustomFields,
  withCustomFieldsList,
} from "@/src/services/custom-field-sync";
import { PipelineService } from "@/src/services/pipeline.service";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

type StageRefs = { pipelineId: string; stageId: string };

/** Valida que `stageId` pertence ao `pipelineId` informado e à workspace. */
async function assertStage(
  workspaceId: string,
  pipelineId: string,
  stageId: string,
): Promise<Result<true>> {
  const belongs = await PipelineRepository.stageBelongsTo(
    stageId,
    pipelineId,
    workspaceId,
  );
  if (!belongs.ok) return belongs;
  if (!belongs.value) return err(pipelineStageNotFound());
  return ok(true);
}

/** Primeira etapa (OPEN de menor posição, ou a primeira) de um pipeline. */
async function firstStageOf(
  workspaceId: string,
  pipelineId: string,
): Promise<Result<string>> {
  const found = await PipelineRepository.findById(pipelineId);
  if (!found.ok) return found;
  const pipeline = found.value;
  if (
    !pipeline ||
    pipeline.workspaceId !== workspaceId ||
    pipeline.deletedAt ||
    pipeline.stages.length === 0
  ) {
    return err(pipelineNotFound());
  }
  const ordered = [...pipeline.stages].sort((a, b) => a.position - b.position);
  const stage = ordered.find((s) => s.category === "OPEN") ?? ordered[0];
  return ok(stage.id);
}

/** Resolve pipeline+etapa para a criação, aplicando os defaults da workspace. */
async function resolveStageForCreate(
  workspaceId: string,
  input: { pipelineId?: string; stageId?: string },
): Promise<Result<StageRefs>> {
  if (input.stageId) {
    if (!input.pipelineId) {
      return err(badRequest("Informe o pipeline ao definir a etapa"));
    }
    const valid = await assertStage(
      workspaceId,
      input.pipelineId,
      input.stageId,
    );
    if (!valid.ok) return valid;
    return ok({ pipelineId: input.pipelineId, stageId: input.stageId });
  }
  if (input.pipelineId) {
    const stage = await firstStageOf(workspaceId, input.pipelineId);
    if (!stage.ok) return stage;
    return ok({ pipelineId: input.pipelineId, stageId: stage.value });
  }
  return PipelineService.resolveDefaultStage(workspaceId);
}

/** Valida company e/ou pointOfContact referenciados pertencem à workspace. */
async function assertReferences(
  workspaceId: string,
  refs: { companyId?: string | null; pointOfContactId?: string | null },
): Promise<Result<true>> {
  if (refs.companyId) {
    const exists = await CompanyRepository.existsInWorkspace(
      refs.companyId,
      workspaceId,
    );
    if (!exists.ok) return exists;
    if (!exists.value) return err(companyNotFound());
  }
  if (refs.pointOfContactId) {
    const exists = await PersonRepository.existsInWorkspace(
      refs.pointOfContactId,
      workspaceId,
    );
    if (!exists.ok) return exists;
    if (!exists.value) return err(personNotFound());
  }
  return ok(true);
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Opportunity>> {
  const found = await OpportunityRepository.findById(id);
  if (!found.ok) return found;
  const opportunity = found.value;
  if (
    !opportunity ||
    opportunity.workspaceId !== workspaceId ||
    opportunity.deletedAt
  ) {
    return err(opportunityNotFound());
  }
  return ok(opportunity);
}

export const OpportunityService = {
  async create(
    userId: string,
    slug: string,
    input: CreateOpportunityInput,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const refs = await assertReferences(ws.value, input);
    if (!refs.ok) return refs;

    const stage = await resolveStageForCreate(ws.value, input);
    if (!stage.ok) return stage;

    const created = await OpportunityRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      amount: input.amount ?? null,
      closeDate: input.closeDate ? new Date(input.closeDate) : null,
      pipelineId: stage.value.pipelineId,
      stageId: stage.value.stageId,
      companyId: input.companyId ?? null,
      pointOfContactId: input.pointOfContactId ?? null,
      ownerId: input.ownerId ?? null,
      source: input.source ?? null,
    });
    if (!created.ok) return created;

    if (input.customFields) {
      const applied = await applyCustomFieldValues(
        ws.value,
        "OPPORTUNITY",
        created.value.id,
        input.customFields,
        userId,
      );
      if (!applied.ok) return applied;
    }

    const merged = await withCustomFields(toOpportunityDTO(created.value));
    if (!merged.ok) return merged;
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "opportunity",
      event: "created",
      record: merged.value,
    });
    return ok(merged.value);
  },

  async list(userId: string, slug: string): Promise<Result<OpportunityDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await OpportunityRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return withCustomFieldsList(result.value.map(toOpportunityDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const opportunity = await loadInWorkspace(ws.value, id);
    if (!opportunity.ok) return opportunity;
    return withCustomFields(toOpportunityDTO(opportunity.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateOpportunityInput,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const refs = await assertReferences(ws.value, input);
    if (!refs.ok) return refs;

    // `closeDate` chega como string ISO (ou null) e vira Date no repositório.
    // `pipelineId`/`stageId` exigem validação cruzada (etapa ∈ funil ∈ workspace).
    // `customFields` é gravado à parte (EAV), fora do update nativo.
    const { closeDate, pipelineId, stageId, customFields, ...rest } = input;
    const data: UpdateOpportunityData = { updatedById: userId, ...rest };
    if (closeDate !== undefined) {
      data.closeDate = closeDate === null ? null : new Date(closeDate);
    }

    if (stageId !== undefined || pipelineId !== undefined) {
      const targetPipelineId = pipelineId ?? existing.value.pipelineId;
      if (stageId !== undefined) {
        const valid = await assertStage(ws.value, targetPipelineId, stageId);
        if (!valid.ok) return valid;
        data.pipelineId = targetPipelineId;
        data.stageId = stageId;
      } else {
        // Trocou de funil sem escolher etapa: cai na primeira etapa do funil.
        const first = await firstStageOf(ws.value, targetPipelineId);
        if (!first.ok) return first;
        data.pipelineId = targetPipelineId;
        data.stageId = first.value;
      }
    }

    const updated = await OpportunityRepository.update(id, data);
    if (!updated.ok) return updated;

    if (customFields) {
      const applied = await applyCustomFieldValues(
        ws.value,
        "OPPORTUNITY",
        id,
        customFields,
        userId,
      );
      if (!applied.ok) return applied;
    }

    const merged = await withCustomFields(toOpportunityDTO(updated.value));
    if (!merged.ok) return merged;
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "opportunity",
      event: "updated",
      record: merged.value,
      changedFields: Object.keys(input),
    });
    return ok(merged.value);
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await OpportunityRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    const dto = toOpportunityDTO(removed.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "opportunity",
      event: "deleted",
      record: dto,
    });
    return ok(dto);
  },

  /** Persiste a ordem manual das oportunidades (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return OpportunityRepository.reorder(ws.value, ids);
  },
};
