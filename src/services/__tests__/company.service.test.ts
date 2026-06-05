import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const companyRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  existsByDomain: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));
vi.mock("@/src/services/custom-field-sync", () => ({
  applyCustomFieldValues: vi.fn(async () => ({ ok: true, value: true })),
  withCustomFields: vi.fn(async (dto) => ({
    ok: true,
    value: { ...dto, customFields: {} },
  })),
  withCustomFieldsList: vi.fn(async (dtos) => ({ ok: true, value: dtos })),
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { CompanyService } from "@/src/services/company.service";

const WORKSPACE_ID = "ws_1";

function company(overrides: Record<string, unknown> = {}) {
  return {
    id: "co_1",
    name: "Acme",
    domain: "acme.com",
    employees: null,
    linkedin: null,
    address: null,
    arr: null,
    icp: false,
    workspaceId: WORKSPACE_ID,
    createdById: "user_1",
    accountOwnerId: null,
    updatedById: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function memberOfWorkspace() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WORKSPACE_ID, slug: "acme" } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(companyRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("CompanyService.create", () => {
  it("retorna WORKSPACE_NOT_FOUND quando não é membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));

    const result = await CompanyService.create("user_1", "acme", {
      name: "Acme",
      icp: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(companyRepo.create).not.toHaveBeenCalled();
  });

  it("cria a empresa no workspace resolvido", async () => {
    memberOfWorkspace();
    companyRepo.existsByDomain.mockResolvedValue(ok(false));
    companyRepo.create.mockResolvedValue(ok(company()));

    const result = await CompanyService.create("user_1", "acme", {
      name: "Acme",
      domain: "acme.com",
      icp: false,
    });

    expect(result.ok).toBe(true);
    expect(companyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        createdById: "user_1",
        domain: "acme.com",
      }),
    );
  });

  it("rejeita domínio já usado com COMPANY_DOMAIN_TAKEN", async () => {
    memberOfWorkspace();
    companyRepo.existsByDomain.mockResolvedValue(ok(true));

    const result = await CompanyService.create("user_1", "acme", {
      name: "Acme",
      domain: "acme.com",
      icp: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_DOMAIN_TAKEN");
    expect(companyRepo.create).not.toHaveBeenCalled();
  });
});

describe("CompanyService.getById", () => {
  it("retorna COMPANY_NOT_FOUND para empresa de outro workspace", async () => {
    memberOfWorkspace();
    companyRepo.findById.mockResolvedValue(
      ok(company({ workspaceId: "ws_outro" })),
    );

    const result = await CompanyService.getById("user_1", "acme", "co_1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_NOT_FOUND");
  });

  it("retorna COMPANY_NOT_FOUND para empresa soft-deletada", async () => {
    memberOfWorkspace();
    companyRepo.findById.mockResolvedValue(
      ok(company({ deletedAt: new Date() })),
    );

    const result = await CompanyService.getById("user_1", "acme", "co_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_NOT_FOUND");
  });
});

describe("CompanyService.update", () => {
  it("não checa unicidade quando o domínio não muda", async () => {
    memberOfWorkspace();
    companyRepo.findById.mockResolvedValue(ok(company({ domain: "acme.com" })));
    companyRepo.update.mockResolvedValue(ok(company({ name: "Novo" })));

    const result = await CompanyService.update("user_2", "acme", "co_1", {
      domain: "acme.com",
      name: "Novo",
    });

    expect(result.ok).toBe(true);
    expect(companyRepo.existsByDomain).not.toHaveBeenCalled();
    expect(companyRepo.update).toHaveBeenCalledWith(
      "co_1",
      expect.objectContaining({ updatedById: "user_2" }),
    );
  });

  it("rejeita novo domínio já usado", async () => {
    memberOfWorkspace();
    companyRepo.findById.mockResolvedValue(ok(company({ domain: "acme.com" })));
    companyRepo.existsByDomain.mockResolvedValue(ok(true));

    const result = await CompanyService.update("user_2", "acme", "co_1", {
      domain: "novo.com",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_DOMAIN_TAKEN");
    expect(companyRepo.update).not.toHaveBeenCalled();
  });
});

describe("CompanyService.remove", () => {
  it("faz soft delete da empresa do workspace", async () => {
    memberOfWorkspace();
    companyRepo.findById.mockResolvedValue(ok(company()));
    companyRepo.softDelete.mockResolvedValue(
      ok(company({ deletedAt: new Date() })),
    );

    const result = await CompanyService.remove("user_1", "acme", "co_1");

    expect(result.ok).toBe(true);
    expect(companyRepo.softDelete).toHaveBeenCalledWith("co_1", "user_1");
  });
});
