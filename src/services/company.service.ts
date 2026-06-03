import type { Company } from "@prisma/client";
import {
  companyCnpjTaken,
  companyDomainTaken,
  companyNotFound,
  workspaceNotFound,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toCompanyDTO } from "@/src/mappers/company.mapper";
import { CompanyRepository } from "@/src/repositories/company.repository";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import type {
  CompanyDTO,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "@/src/schemas/company.schema";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";

/**
 * Resolve o workspace pelo slug garantindo que o usuário seja membro.
 * Não-membros recebem WORKSPACE_NOT_FOUND (não vazamos existência).
 */
async function resolveWorkspaceId(
  userId: string,
  slug: string,
): Promise<Result<string>> {
  const membership = await MembershipRepository.findByUserAndSlug(userId, slug);
  if (!membership.ok) return membership;
  if (!membership.value) return err(workspaceNotFound());
  return ok(membership.value.workspace.id);
}

/** Carrega uma empresa garantindo que pertence ao workspace e não foi deletada. */
async function loadInWorkspace(
  workspaceId: string,
  companyId: string,
): Promise<Result<Company>> {
  const found = await CompanyRepository.findById(companyId);
  if (!found.ok) return found;
  const company = found.value;
  if (!company || company.workspaceId !== workspaceId || company.deletedAt) {
    return err(companyNotFound());
  }
  return ok(company);
}

export const CompanyService = {
  /** Cria uma empresa no workspace do slug (exige membership). */
  async create(
    userId: string,
    slug: string,
    input: CreateCompanyInput,
  ): Promise<Result<CompanyDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    if (input.domain) {
      const exists = await CompanyRepository.existsByDomain(
        ws.value,
        input.domain,
      );
      if (!exists.ok) return exists;
      if (exists.value) return err(companyDomainTaken());
    }

    if (input.cnpj) {
      const exists = await CompanyRepository.existsByCnpj(ws.value, input.cnpj);
      if (!exists.ok) return exists;
      if (exists.value) return err(companyCnpjTaken());
    }

    const created = await CompanyRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name ?? "",
      cnpj: input.cnpj ?? null,
      domain: input.domain ?? null,
      employees: input.employees ?? null,
      linkedin: input.linkedin ?? null,
      address: input.address ?? null,
      arr: input.arr ?? null,
      icp: input.icp,
      accountOwnerId: input.accountOwnerId ?? null,
    });
    if (!created.ok) return created;
    const dto = toCompanyDTO(created.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "company",
      event: "created",
      record: dto,
    });
    return ok(dto);
  },

  /** Lista as empresas (não-deletadas) do workspace do slug. */
  async list(userId: string, slug: string): Promise<Result<CompanyDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await CompanyRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toCompanyDTO));
  },

  /** Busca uma empresa por id, garantindo escopo de workspace. */
  async getById(
    userId: string,
    slug: string,
    companyId: string,
  ): Promise<Result<CompanyDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const company = await loadInWorkspace(ws.value, companyId);
    if (!company.ok) return company;
    return ok(toCompanyDTO(company.value));
  },

  /** Atualiza campos de uma empresa. */
  async update(
    userId: string,
    slug: string,
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<Result<CompanyDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, companyId);
    if (!existing.ok) return existing;

    // Domínio só precisa de checagem de unicidade quando muda para um valor não-nulo.
    if (input.domain && input.domain !== existing.value.domain) {
      const taken = await CompanyRepository.existsByDomain(
        ws.value,
        input.domain,
        companyId,
      );
      if (!taken.ok) return taken;
      if (taken.value) return err(companyDomainTaken());
    }

    // CNPJ idem: só checa unicidade quando muda para um valor não-nulo.
    if (input.cnpj && input.cnpj !== existing.value.cnpj) {
      const taken = await CompanyRepository.existsByCnpj(
        ws.value,
        input.cnpj,
        companyId,
      );
      if (!taken.ok) return taken;
      if (taken.value) return err(companyCnpjTaken());
    }

    const updated = await CompanyRepository.update(companyId, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    const dto = toCompanyDTO(updated.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "company",
      event: "updated",
      record: dto,
      changedFields: Object.keys(input),
    });
    return ok(dto);
  },

  /** Soft delete de uma empresa. */
  async remove(
    userId: string,
    slug: string,
    companyId: string,
  ): Promise<Result<CompanyDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, companyId);
    if (!existing.ok) return existing;

    const removed = await CompanyRepository.softDelete(companyId, userId);
    if (!removed.ok) return removed;
    const dto = toCompanyDTO(removed.value);
    await dispatchRecordEvent({
      workspaceId: ws.value,
      actingUserId: userId,
      entity: "company",
      event: "deleted",
      record: dto,
    });
    return ok(dto);
  },

  /** Persiste a ordem manual das empresas (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    return CompanyRepository.reorder(ws.value, ids);
  },
};
