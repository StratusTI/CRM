import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const personRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  existsInWorkspace: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));
const companyRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/services/custom-field-sync", () => ({
  applyCustomFieldValues: vi.fn(async () => ({ ok: true, value: true })),
  withCustomFields: vi.fn(async (dto) => ({
    ok: true,
    value: { ...dto, customFields: {} },
  })),
  withCustomFieldsList: vi.fn(async (dtos) => ({ ok: true, value: dtos })),
}));

import { PersonService } from "@/src/services/person.service";

const WS = "ws_1";

function person(overrides: Record<string, unknown> = {}) {
  return {
    id: "p_1",
    name: "Ada",
    emails: [],
    phones: [],
    city: null,
    jobTitle: null,
    linkedin: null,
    avatar: null,
    companyId: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS, slug: "acme" } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(personRepo)) fn.mockReset();
  for (const fn of Object.values(companyRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("PersonService.create", () => {
  it("WORKSPACE_NOT_FOUND quando não é membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await PersonService.create("user_1", "acme", {
      name: "Ada",
      emails: [],
      phones: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
  });

  it("valida company referenciada (COMPANY_NOT_FOUND)", async () => {
    asMember();
    companyRepo.existsInWorkspace.mockResolvedValue(ok(false));
    const result = await PersonService.create("user_1", "acme", {
      name: "Ada",
      emails: [],
      phones: [],
      companyId: "co_x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_NOT_FOUND");
    expect(personRepo.create).not.toHaveBeenCalled();
  });

  it("cria a pessoa quando a company é válida", async () => {
    asMember();
    companyRepo.existsInWorkspace.mockResolvedValue(ok(true));
    personRepo.create.mockResolvedValue(ok(person({ companyId: "co_1" })));
    const result = await PersonService.create("user_1", "acme", {
      name: "Ada",
      emails: [],
      phones: [],
      companyId: "co_1",
    });
    expect(result.ok).toBe(true);
    expect(personRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WS, createdById: "user_1" }),
    );
  });
});

describe("PersonService.getById", () => {
  it("PERSON_NOT_FOUND para outra workspace", async () => {
    asMember();
    personRepo.findById.mockResolvedValue(ok(person({ workspaceId: "ws_2" })));
    const result = await PersonService.getById("user_1", "acme", "p_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERSON_NOT_FOUND");
  });
});

describe("PersonService.remove", () => {
  it("soft delete da pessoa", async () => {
    asMember();
    personRepo.findById.mockResolvedValue(ok(person()));
    personRepo.softDelete.mockResolvedValue(
      ok(person({ deletedAt: new Date() })),
    );
    const result = await PersonService.remove("user_1", "acme", "p_1");
    expect(result.ok).toBe(true);
    expect(personRepo.softDelete).toHaveBeenCalledWith("p_1", "user_1");
  });
});
