import type { Person } from "@prisma/client";
import { companyNotFound, personNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toPersonDTO } from "@/src/mappers/person.mapper";
import { CompanyRepository } from "@/src/repositories/company.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import type {
  CreatePersonInput,
  PersonDTO,
  UpdatePersonInput,
} from "@/src/schemas/person.schema";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** Garante que a Company referenciada existe na workspace. */
async function assertCompanyInWorkspace(
  companyId: string,
  workspaceId: string,
): Promise<Result<true>> {
  const exists = await CompanyRepository.existsInWorkspace(
    companyId,
    workspaceId,
  );
  if (!exists.ok) return exists;
  if (!exists.value) return err(companyNotFound());
  return ok(true);
}

/** Carrega uma pessoa garantindo escopo de workspace e que não foi deletada. */
async function loadInWorkspace(
  workspaceId: string,
  personId: string,
): Promise<Result<Person>> {
  const found = await PersonRepository.findById(personId);
  if (!found.ok) return found;
  const person = found.value;
  if (!person || person.workspaceId !== workspaceId || person.deletedAt) {
    return err(personNotFound());
  }
  return ok(person);
}

export const PersonService = {
  async create(
    userId: string,
    slug: string,
    input: CreatePersonInput,
  ): Promise<Result<PersonDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    if (input.companyId) {
      const check = await assertCompanyInWorkspace(input.companyId, ws.value);
      if (!check.ok) return check;
    }

    const created = await PersonRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      emails: input.emails,
      phones: input.phones,
      city: input.city ?? null,
      jobTitle: input.jobTitle ?? null,
      linkedin: input.linkedin ?? null,
      avatar: input.avatar ?? null,
      companyId: input.companyId ?? null,
    });
    if (!created.ok) return created;
    const dto = toPersonDTO(created.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "person",
      event: "created",
      record: dto,
    });
    return ok(dto);
  },

  async list(userId: string, slug: string): Promise<Result<PersonDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await PersonRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toPersonDTO));
  },

  async getById(
    userId: string,
    slug: string,
    personId: string,
  ): Promise<Result<PersonDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const person = await loadInWorkspace(ws.value, personId);
    if (!person.ok) return person;
    return ok(toPersonDTO(person.value));
  },

  async update(
    userId: string,
    slug: string,
    personId: string,
    input: UpdatePersonInput,
  ): Promise<Result<PersonDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, personId);
    if (!existing.ok) return existing;

    if (input.companyId) {
      const check = await assertCompanyInWorkspace(input.companyId, ws.value);
      if (!check.ok) return check;
    }

    const updated = await PersonRepository.update(personId, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    const dto = toPersonDTO(updated.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "person",
      event: "updated",
      record: dto,
      changedFields: Object.keys(input),
    });
    return ok(dto);
  },

  async remove(
    userId: string,
    slug: string,
    personId: string,
  ): Promise<Result<PersonDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, personId);
    if (!existing.ok) return existing;

    const removed = await PersonRepository.softDelete(personId, userId);
    if (!removed.ok) return removed;
    const dto = toPersonDTO(removed.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "person",
      event: "deleted",
      record: dto,
    });
    return ok(dto);
  },

  /** Persiste a ordem manual das pessoas (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return PersonRepository.reorder(ws.value, ids);
  },
};
