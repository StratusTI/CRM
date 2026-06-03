import { describe, expect, it } from "vitest";
import { createCompany } from "@/src/__tests__/factories/company.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { CompanyRepository } from "@/src/repositories/company.repository";

async function workspaceAndOwner() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("CompanyRepository (integração)", () => {
  it("create persiste os campos e o escopo", async () => {
    const { owner, workspace } = await workspaceAndOwner();

    const result = await CompanyRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Acme",
      cnpj: "11222333000181",
      domain: "acme.com",
      employees: 50,
      linkedin: "https://linkedin.com/company/acme",
      address: { cep: "01310-100", street: "Av. Paulista", city: "São Paulo" },
      arr: 120000,
      icp: true,
      accountOwnerId: owner.id,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Acme");
      expect(result.value.cnpj).toBe("11222333000181");
      expect(result.value.workspaceId).toBe(workspace.id);
      expect(result.value.arr?.toString()).toBe("120000");
      expect(result.value.icp).toBe(true);
      expect(result.value.address).toEqual({
        cep: "01310-100",
        street: "Av. Paulista",
        city: "São Paulo",
      });
    }
  });

  it("listByWorkspace retorna apenas não-deletadas da workspace", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    const other = await workspaceAndOwner();

    const keep = await createCompany(workspace.id, owner.id);
    const removed = await createCompany(workspace.id, owner.id);
    await createCompany(other.workspace.id, other.owner.id);
    await CompanyRepository.softDelete(removed.id, owner.id);

    const result = await CompanyRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("existsByDomain respeita workspace, soft-delete e excludeId", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    const company = await createCompany(workspace.id, owner.id, {
      domain: "dup.com",
    });

    const exists = await CompanyRepository.existsByDomain(
      workspace.id,
      "dup.com",
    );
    expect(exists.ok && exists.value).toBe(true);

    const excludingSelf = await CompanyRepository.existsByDomain(
      workspace.id,
      "dup.com",
      company.id,
    );
    expect(excludingSelf.ok && excludingSelf.value).toBe(false);

    await CompanyRepository.softDelete(company.id, owner.id);
    const afterDelete = await CompanyRepository.existsByDomain(
      workspace.id,
      "dup.com",
    );
    expect(afterDelete.ok && afterDelete.value).toBe(false);
  });

  it("existsByCnpj respeita workspace, soft-delete e excludeId", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    const company = await createCompany(workspace.id, owner.id, {
      cnpj: "11222333000181",
    });

    const exists = await CompanyRepository.existsByCnpj(
      workspace.id,
      "11222333000181",
    );
    expect(exists.ok && exists.value).toBe(true);

    const excludingSelf = await CompanyRepository.existsByCnpj(
      workspace.id,
      "11222333000181",
      company.id,
    );
    expect(excludingSelf.ok && excludingSelf.value).toBe(false);

    await CompanyRepository.softDelete(company.id, owner.id);
    const afterDelete = await CompanyRepository.existsByCnpj(
      workspace.id,
      "11222333000181",
    );
    expect(afterDelete.ok && afterDelete.value).toBe(false);
  });

  it("update altera campos e registra updatedById", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    const editor = await createUser();
    const company = await createCompany(workspace.id, owner.id);

    const result = await CompanyRepository.update(company.id, {
      updatedById: editor.id,
      name: "Renomeada",
      accountOwnerId: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Renomeada");
      expect(result.value.updatedById).toBe(editor.id);
      expect(result.value.accountOwnerId).toBeNull();
    }
  });

  it("softDelete marca deletedAt", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    const company = await createCompany(workspace.id, owner.id);

    const result = await CompanyRepository.softDelete(company.id, owner.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.deletedAt).not.toBeNull();
  });
});
