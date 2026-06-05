import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const personRepo = vi.hoisted(() => ({
  findByEmailOrPhone: vi.fn(),
  create: vi.fn(),
}));
const oppRepo = vi.hoisted(() => ({ create: vi.fn() }));
const companyRepo = vi.hoisted(() => ({ existsInWorkspace: vi.fn() }));
const pipelineService = vi.hoisted(() => ({ resolveDefaultStage: vi.fn() }));
const dispatch = vi.hoisted(() => vi.fn());

vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/repositories/opportunity.repository", () => ({
  OpportunityRepository: oppRepo,
}));
vi.mock("@/src/repositories/company.repository", () => ({
  CompanyRepository: companyRepo,
}));
vi.mock("@/src/services/pipeline.service", () => ({
  PipelineService: pipelineService,
}));
vi.mock("@/src/services/workflow-dispatcher", () => ({
  dispatchRecordEvent: dispatch,
}));

import { LeadIngestService } from "@/src/services/lead-ingest.service";

const WS = "ws_1";
const ACTOR = "user_1";

function person(overrides: Record<string, unknown> = {}) {
  return {
    id: "p_1",
    name: "Ada Lovelace",
    emails: ["ada@example.com"],
    phones: [],
    city: null,
    jobTitle: null,
    linkedin: null,
    avatar: null,
    companyId: null,
    workspaceId: WS,
    createdById: ACTOR,
    updatedById: null,
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function opp(overrides: Record<string, unknown> = {}) {
  return {
    id: "op_1",
    name: "Ada Lovelace",
    amount: null,
    closeDate: null,
    pipelineId: "pl_1",
    stageId: "st_1",
    companyId: null,
    pointOfContactId: "p_1",
    ownerId: null,
    source: null,
    workspaceId: WS,
    createdById: ACTOR,
    updatedById: null,
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  companyRepo.existsInWorkspace.mockResolvedValue(ok(true));
  pipelineService.resolveDefaultStage.mockResolvedValue(
    ok({ pipelineId: "pl_1", stageId: "st_1" }),
  );
});

describe("LeadIngestService.ingest", () => {
  it("cria pessoa e oportunidade quando o contato é novo", async () => {
    personRepo.findByEmailOrPhone.mockResolvedValue(ok(null));
    personRepo.create.mockResolvedValue(ok(person()));
    oppRepo.create.mockResolvedValue(ok(opp({ source: "WHATSAPP" })));

    const result = await LeadIngestService.ingest(WS, ACTOR, {
      person: { name: "Ada Lovelace", emails: ["ada@example.com"], phones: [] },
      opportunity: { source: "WHATSAPP" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.personReused).toBe(false);
    expect(result.value.opportunity.pointOfContactId).toBe("p_1");
    expect(result.value.opportunity.source).toBe("WHATSAPP");
    expect(personRepo.create).toHaveBeenCalledOnce();
    // dispara person.created (nova) e opportunity.created
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("reutiliza pessoa existente e não a recria (dedup)", async () => {
    personRepo.findByEmailOrPhone.mockResolvedValue(ok(person()));
    oppRepo.create.mockResolvedValue(ok(opp()));

    const result = await LeadIngestService.ingest(WS, ACTOR, {
      person: { name: "Ada", emails: ["ada@example.com"], phones: [] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.personReused).toBe(true);
    expect(personRepo.create).not.toHaveBeenCalled();
    // só opportunity.created — pessoa reaproveitada não redispara person.created
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("herda o nome da pessoa quando a oportunidade não tem nome", async () => {
    personRepo.findByEmailOrPhone.mockResolvedValue(ok(null));
    personRepo.create.mockResolvedValue(ok(person({ name: "Grace Hopper" })));
    oppRepo.create.mockResolvedValue(ok(opp()));

    await LeadIngestService.ingest(WS, ACTOR, {
      person: { name: "Grace Hopper", emails: [], phones: ["+551199"] },
    });

    expect(oppRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Grace Hopper",
        pointOfContactId: "p_1",
      }),
    );
  });

  it("falha quando a company referenciada não existe na workspace", async () => {
    companyRepo.existsInWorkspace.mockResolvedValue(ok(false));

    const result = await LeadIngestService.ingest(WS, ACTOR, {
      person: { name: "Ada", emails: [], phones: [], companyId: "co_x" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("COMPANY_NOT_FOUND");
    expect(personRepo.create).not.toHaveBeenCalled();
  });
});
