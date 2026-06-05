import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const wfRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  findActiveByWebhookToken: vi.fn(),
}));
const versionRepo = vi.hoisted(() => ({
  findDraft: vi.fn(),
  findActive: vi.fn(),
  findById: vi.fn(),
  listByWorkflow: vi.fn(),
  updateDefinition: vi.fn(),
  activateDraft: vi.fn(),
  discardDraft: vi.fn(),
}));
const runRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkflow: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({ findByUserAndSlug: vi.fn() }));
const runner = vi.hoisted(() => ({
  runWorkflow: vi.fn(),
  resumeWorkflow: vi.fn(),
}));

vi.mock("@/src/repositories/workflow.repository", () => ({
  WorkflowRepository: wfRepo,
}));
vi.mock("@/src/repositories/workflow-version.repository", () => ({
  WorkflowVersionRepository: versionRepo,
}));
vi.mock("@/src/repositories/workflow-run.repository", () => ({
  WorkflowRunRepository: runRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/services/workflow-runner", () => runner);

import { WorkflowService } from "@/src/services/workflow.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

const EMPTY_DEF = {
  trigger: { id: "trigger", position: { x: 0, y: 0 }, data: null },
  nodes: [],
  edges: [],
};

function workflow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf_1",
    name: "Fluxo",
    description: null,
    status: "DRAFT",
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
    activeVersionId: null,
    lastRunAt: null,
    position: 0,
    createdAt: D,
    updatedAt: D,
    deletedAt: null,
    ...overrides,
  };
}

function version(overrides: Record<string, unknown> = {}) {
  return {
    id: "v_1",
    workflowId: "wf_1",
    version: 1,
    status: "DRAFT",
    definition: EMPTY_DEF,
    createdAt: D,
    updatedAt: D,
    ...overrides,
  };
}

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: "r_1",
    workflowId: "wf_1",
    versionId: "v_1",
    status: "SUCCEEDED",
    triggerType: "LAUNCH_MANUALLY",
    triggerPayload: {},
    state: null,
    waitingStepId: null,
    startedById: "user_1",
    error: null,
    startedAt: D,
    finishedAt: D,
    createdAt: D,
    updatedAt: D,
    steps: [],
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(wfRepo)) fn.mockReset();
  for (const fn of Object.values(versionRepo)) fn.mockReset();
  for (const fn of Object.values(runRepo)) fn.mockReset();
  memberRepo.findByUserAndSlug.mockReset();
  runner.runWorkflow.mockReset();
  runner.resumeWorkflow.mockReset();
});

describe("WorkflowService CRUD", () => {
  it("create escopa à workspace com definição vazia", async () => {
    asMember();
    wfRepo.create.mockResolvedValue(ok(workflow()));
    const result = await WorkflowService.create("user_1", "acme", {
      name: "Fluxo",
    });
    expect(result.ok).toBe(true);
    expect(wfRepo.create.mock.calls[0][0].workspaceId).toBe(WS);
  });

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await WorkflowService.list("user_1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
  });

  it("getById WORKFLOW_NOT_FOUND para outra workspace", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow({ workspaceId: "ws_2" })));
    const result = await WorkflowService.getById("user_1", "acme", "wf_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKFLOW_NOT_FOUND");
  });

  it("getById WORKFLOW_NOT_FOUND para deletado", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow({ deletedAt: D })));
    const result = await WorkflowService.getById("user_1", "acme", "wf_1");
    expect(result.ok).toBe(false);
  });

  it("update carimba updatedById", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    wfRepo.update.mockResolvedValue(ok(workflow({ name: "Novo" })));
    const result = await WorkflowService.update("user_1", "acme", "wf_1", {
      name: "Novo",
    });
    expect(result.ok).toBe(true);
    expect(wfRepo.update.mock.calls[0][1].updatedById).toBe("user_1");
  });

  it("remove soft-delete", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    wfRepo.softDelete.mockResolvedValue(ok(workflow({ deletedAt: D })));
    const result = await WorkflowService.remove("user_1", "acme", "wf_1");
    expect(result.ok).toBe(true);
    expect(wfRepo.softDelete).toHaveBeenCalledWith("wf_1", "user_1");
  });
});

describe("WorkflowService drafts", () => {
  it("getDraft WORKFLOW_VERSION_NOT_FOUND quando não há draft", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findDraft.mockResolvedValue(ok(null));
    const result = await WorkflowService.getDraft("user_1", "acme", "wf_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WORKFLOW_VERSION_NOT_FOUND");
    }
  });

  it("updateDraft rejeita definição inválida", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findDraft.mockResolvedValue(ok(version()));
    const result = await WorkflowService.updateDraft("user_1", "acme", "wf_1", {
      definition: { garbage: true } as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WORKFLOW_INVALID_DEFINITION");
    }
  });

  it("updateDraft persiste definição válida e toca o workflow", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findDraft.mockResolvedValue(ok(version()));
    versionRepo.updateDefinition.mockResolvedValue(ok(version()));
    wfRepo.update.mockResolvedValue(ok(workflow()));
    const result = await WorkflowService.updateDraft("user_1", "acme", "wf_1", {
      definition: EMPTY_DEF as never,
    });
    expect(result.ok).toBe(true);
    expect(versionRepo.updateDefinition).toHaveBeenCalled();
    expect(wfRepo.update).toHaveBeenCalledWith("wf_1", {
      updatedById: "user_1",
    });
  });

  it("activate exige trigger configurado", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findDraft.mockResolvedValue(ok(version()));
    const result = await WorkflowService.activate("user_1", "acme", "wf_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WORKFLOW_INVALID_DEFINITION");
    }
  });

  it("activate ativa quando o trigger está configurado", async () => {
    asMember();
    wfRepo.findById
      .mockResolvedValueOnce(ok(workflow()))
      .mockResolvedValueOnce(ok(workflow({ activeVersionId: "v_1" })));
    versionRepo.findDraft.mockResolvedValue(
      ok(
        version({
          definition: {
            ...EMPTY_DEF,
            trigger: {
              id: "trigger",
              position: { x: 0, y: 0 },
              data: { type: "launch-manually" },
            },
          },
        }),
      ),
    );
    versionRepo.activateDraft.mockResolvedValue(ok(version()));
    const result = await WorkflowService.activate("user_1", "acme", "wf_1");
    expect(result.ok).toBe(true);
  });
});

describe("WorkflowService.triggerManual", () => {
  it("usa a versão ACTIVE e dispara o runner", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findActive.mockResolvedValue(ok(version()));
    runRepo.create.mockResolvedValue(ok(run()));
    runner.runWorkflow.mockResolvedValue(undefined);
    runRepo.findById.mockResolvedValue(ok(run()));
    const result = await WorkflowService.triggerManual(
      "user_1",
      "acme",
      "wf_1",
      { test: false, payload: { a: 1 } },
    );
    expect(result.ok).toBe(true);
    expect(versionRepo.findActive).toHaveBeenCalledWith("wf_1");
    expect(runner.runWorkflow).toHaveBeenCalled();
  });

  it("usa o DRAFT em test mode", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findDraft.mockResolvedValue(ok(version()));
    runRepo.create.mockResolvedValue(ok(run()));
    runner.runWorkflow.mockResolvedValue(undefined);
    runRepo.findById.mockResolvedValue(ok(run()));
    const result = await WorkflowService.triggerManual(
      "user_1",
      "acme",
      "wf_1",
      { test: true, payload: {} },
    );
    expect(result.ok).toBe(true);
    expect(versionRepo.findDraft).toHaveBeenCalledWith("wf_1");
  });

  it("WORKFLOW_EXECUTION_FAILED quando o runner lança", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    versionRepo.findActive.mockResolvedValue(ok(version()));
    runRepo.create.mockResolvedValue(ok(run()));
    runner.runWorkflow.mockRejectedValue(new Error("boom"));
    const result = await WorkflowService.triggerManual(
      "user_1",
      "acme",
      "wf_1",
      { test: false, payload: {} },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WORKFLOW_EXECUTION_FAILED");
    }
  });
});

describe("WorkflowService.triggerWebhook", () => {
  it("WORKFLOW_WEBHOOK_INVALID quando o token não resolve", async () => {
    wfRepo.findActiveByWebhookToken.mockResolvedValue(ok(null));
    const result = await WorkflowService.triggerWebhook("tok", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKFLOW_WEBHOOK_INVALID");
  });

  it("dispara contra a versão ativa", async () => {
    wfRepo.findActiveByWebhookToken.mockResolvedValue(
      ok({ ...workflow(), activeVersion: version() }),
    );
    runRepo.create.mockResolvedValue(ok(run({ triggerType: "WEBHOOK" })));
    runner.runWorkflow.mockResolvedValue(undefined);
    runRepo.findById.mockResolvedValue(ok(run({ triggerType: "WEBHOOK" })));
    const result = await WorkflowService.triggerWebhook("tok", { a: 1 });
    expect(result.ok).toBe(true);
    expect(runner.runWorkflow).toHaveBeenCalled();
  });
});

describe("WorkflowService.resumeRun", () => {
  it("recusa run que não está aguardando input", async () => {
    asMember();
    wfRepo.findById.mockResolvedValue(ok(workflow()));
    runRepo.findById.mockResolvedValue(ok(run({ status: "SUCCEEDED" })));
    const result = await WorkflowService.resumeRun(
      "user_1",
      "acme",
      "wf_1",
      "r_1",
      { payload: {} },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WORKFLOW_EXECUTION_FAILED");
    }
  });
});
