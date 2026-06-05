import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const oppRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  existsInWorkspace: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));
const companyRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const personRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const pipelineRepo = vi.hoisted(() => ({
  stageBelongsTo: vi.fn(),
  findById: vi.fn(),
}));
const pipelineService = vi.hoisted(() => ({ resolveDefaultStage: vi.fn() }));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/opportunity.repository", () => ({
  OpportunityRepository: oppRepo,
}));
vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));
vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/repositories/pipeline.repository", () => ({
  PipelineRepository: pipelineRepo,
}));
vi.mock("@/src/services/pipeline.service", () => ({
  PipelineService: pipelineService,
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

import { OpportunityService } from "@/src/services/opportunity.service";

const WS = "ws_1";

function opp(overrides: Record<string, unknown> = {}) {
  return {
    id: "op_1",
    name: "Deal",
    amount: null,
    closeDate: null,
    pipelineId: "pl_1",
    stageId: "st_1",
    companyId: null,
    pointOfContactId: null,
    ownerId: null,
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
  for (const fn of Object.values(oppRepo)) fn.mockReset();
  for (const fn of Object.values(companyRepo)) fn.mockReset();
  for (const fn of Object.values(personRepo)) fn.mockReset();
  for (const fn of Object.values(pipelineRepo)) fn.mockReset();
  pipelineService.resolveDefaultStage.mockReset();
  pipelineService.resolveDefaultStage.mockResolvedValue(
    ok({ pipelineId: "pl_1", stageId: "st_1" }),
  );
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("OpportunityService.create", () => {
  it("converte closeDate ISO em Date ao criar", async () => {
    asMember();
    oppRepo.create.mockResolvedValue(ok(opp()));
    await OpportunityService.create("user_1", "acme", {
      name: "Deal",
      closeDate: "2026-06-01T00:00:00.000Z",
    });
    const arg = oppRepo.create.mock.calls[0][0];
    expect(arg.closeDate).toBeInstanceOf(Date);
    expect(arg.closeDate.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("rejeita pointOfContact inexistente com PERSON_NOT_FOUND", async () => {
    asMember();
    personRepo.existsInWorkspace.mockResolvedValue(ok(false));
    const result = await OpportunityService.create("user_1", "acme", {
      name: "Deal",
      pointOfContactId: "p_x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERSON_NOT_FOUND");
    expect(oppRepo.create).not.toHaveBeenCalled();
  });
});

describe("OpportunityService.update", () => {
  it("limpa closeDate quando recebe null", async () => {
    asMember();
    oppRepo.findById.mockResolvedValue(ok(opp()));
    oppRepo.update.mockResolvedValue(ok(opp()));
    await OpportunityService.update("user_2", "acme", "op_1", {
      closeDate: null,
    });
    const arg = oppRepo.update.mock.calls[0][1];
    expect(arg.closeDate).toBeNull();
    expect(arg.updatedById).toBe("user_2");
  });
});

describe("OpportunityService.getById", () => {
  it("OPPORTUNITY_NOT_FOUND para outra workspace", async () => {
    asMember();
    oppRepo.findById.mockResolvedValue(ok(opp({ workspaceId: "ws_2" })));
    const result = await OpportunityService.getById("user_1", "acme", "op_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("OPPORTUNITY_NOT_FOUND");
  });
});
