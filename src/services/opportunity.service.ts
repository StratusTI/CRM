import type { Opportunity } from "@prisma/client";
import {
  companyNotFound,
  opportunityNotFound,
  personNotFound,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toOpportunityDTO } from "@/src/mappers/opportunity.mapper";
import { CompanyRepository } from "@/src/repositories/company.repository";
import {
  OpportunityRepository,
  type UpdateOpportunityData,
} from "@/src/repositories/opportunity.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import type {
  CreateOpportunityInput,
  OpportunityDTO,
  UpdateOpportunityInput,
} from "@/src/schemas/opportunity.schema";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

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
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const refs = await assertReferences(ws.value, input);
    if (!refs.ok) return refs;

    const created = await OpportunityRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      amount: input.amount ?? null,
      closeDate: input.closeDate ? new Date(input.closeDate) : null,
      stage: input.stage,
      companyId: input.companyId ?? null,
      pointOfContactId: input.pointOfContactId ?? null,
      ownerId: input.ownerId ?? null,
    });
    if (!created.ok) return created;
    const dto = toOpportunityDTO(created.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "opportunity",
      event: "created",
      record: dto,
    });
    return ok(dto);
  },

  async list(userId: string, slug: string): Promise<Result<OpportunityDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await OpportunityRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toOpportunityDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const opportunity = await loadInWorkspace(ws.value, id);
    if (!opportunity.ok) return opportunity;
    return ok(toOpportunityDTO(opportunity.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateOpportunityInput,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const refs = await assertReferences(ws.value, input);
    if (!refs.ok) return refs;

    // `closeDate` chega como string ISO (ou null) e vira Date no repositório.
    const { closeDate, ...rest } = input;
    const data: UpdateOpportunityData = { updatedById: userId, ...rest };
    if (closeDate !== undefined) {
      data.closeDate = closeDate === null ? null : new Date(closeDate);
    }

    const updated = await OpportunityRepository.update(id, data);
    if (!updated.ok) return updated;
    const dto = toOpportunityDTO(updated.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "opportunity",
      event: "updated",
      record: dto,
      changedFields: Object.keys(input),
    });
    return ok(dto);
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<OpportunityDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
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
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return OpportunityRepository.reorder(ws.value, ids);
  },
};
