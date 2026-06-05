import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const runRepo = vi.hoisted(() => ({
  setStatus: vi.fn(),
  createStep: vi.fn(),
  updateStep: vi.fn(),
  pause: vi.fn(),
  clearPause: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  company: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  person: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  opportunity: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  task: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  note: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}));
const resend = vi.hoisted(() => ({
  getResendClient: vi.fn(),
  getFromAddress: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/src/repositories/workflow-run.repository", () => ({
  WorkflowRunRepository: runRepo,
}));
vi.mock("@/src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/src/lib/resend", () => ({
  getResendClient: resend.getResendClient,
  getFromAddress: resend.getFromAddress,
}));

import { resumeWorkflow, runWorkflow } from "@/src/services/workflow-runner";

// biome-ignore lint/suspicious/noExplicitAny: fixtures de grafo livres de schema
type AnyDef = any;

function node(id: string, data: Record<string, unknown>) {
  return { id, position: { x: 0, y: 0 }, data };
}

function def(nodes: AnyDef[], edges: AnyDef[]): AnyDef {
  return {
    trigger: { id: "trigger", position: { x: 0, y: 0 }, data: null },
    nodes,
    edges,
  };
}

function baseParams(
  definition: AnyDef,
  overrides: Record<string, unknown> = {},
) {
  return {
    runId: "run_1",
    workspaceId: "ws_1",
    actingUserId: "user_1",
    definition,
    triggerType: "launch-manually" as const,
    triggerPayload: { record: { id: "rec_1", name: "Acme" } },
    testMode: false,
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(runRepo)) fn.mockReset();
  for (const entity of Object.values(prismaMock)) {
    for (const fn of Object.values(entity)) fn.mockReset();
  }
  resend.getResendClient.mockReset();
  resend.getFromAddress.mockReset();
  resend.send.mockReset();

  runRepo.setStatus.mockResolvedValue(ok({}));
  runRepo.createStep.mockResolvedValue(ok({ id: "step_1" }));
  runRepo.updateStep.mockResolvedValue(ok({}));
  runRepo.pause.mockResolvedValue(ok({}));
  runRepo.clearPause.mockResolvedValue(ok({}));
});

describe("runWorkflow", () => {
  it("RUNNING → COMPLETED executando create-record real", async () => {
    prismaMock.company.create.mockResolvedValue({ id: "co_1" });
    const definition = def(
      [
        node("n1", {
          type: "create-record",
          entity: "company",
          fields: { name: "Acme" },
        }),
      ],
      [{ source: "trigger", target: "n1" }],
    );

    await runWorkflow(baseParams(definition));

    expect(runRepo.setStatus).toHaveBeenCalledWith("run_1", "RUNNING");
    expect(prismaMock.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Acme",
        workspaceId: "ws_1",
        createdById: "user_1",
      }),
    });
    expect(runRepo.setStatus).toHaveBeenLastCalledWith(
      "run_1",
      "COMPLETED",
      expect.objectContaining({ error: null }),
    );
  });

  it("testMode não toca o banco (simula a criação)", async () => {
    const definition = def(
      [
        node("n1", {
          type: "create-record",
          entity: "company",
          fields: { name: "Acme" },
        }),
      ],
      [{ source: "trigger", target: "n1" }],
    );
    await runWorkflow(baseParams(definition, { testMode: true }));
    expect(prismaMock.company.create).not.toHaveBeenCalled();
    expect(runRepo.setStatus).toHaveBeenLastCalledWith(
      "run_1",
      "COMPLETED",
      expect.anything(),
    );
  });

  it("resolve expressões do trigger no update-record", async () => {
    prismaMock.person.update.mockResolvedValue({ id: "rec_1" });
    const definition = def(
      [
        node("n1", {
          type: "update-record",
          entity: "person",
          recordId: "{{trigger.record.id}}",
          fields: { name: "{{trigger.record.name}}" },
        }),
      ],
      [{ source: "trigger", target: "n1" }],
    );
    await runWorkflow(baseParams(definition));
    expect(prismaMock.person.update).toHaveBeenCalledWith({
      where: { id: "rec_1" },
      data: expect.objectContaining({ name: "Acme", updatedById: "user_1" }),
    });
  });

  it("filter que falha marca SKIPPED e não segue para o filho", async () => {
    prismaMock.company.create.mockResolvedValue({ id: "co_1" });
    const definition = def(
      [
        node("f", {
          type: "filter",
          conditions: [
            {
              field: "{{trigger.record.id}}",
              operator: "equals",
              value: "OUTRO",
            },
          ],
        }),
        node("n2", {
          type: "create-record",
          entity: "company",
          fields: { name: "X" },
        }),
      ],
      [
        { source: "trigger", target: "f" },
        { source: "f", target: "n2" },
      ],
    );
    await runWorkflow(baseParams(definition));
    expect(prismaMock.company.create).not.toHaveBeenCalled();
    expect(runRepo.updateStep).toHaveBeenCalledWith(
      "step_1",
      expect.objectContaining({ status: "SKIPPED" }),
    );
  });

  it("if-else roteia pelo branch verdadeiro", async () => {
    prismaMock.task.create.mockResolvedValue({ id: "t_1" });
    const definition = def(
      [
        node("c", {
          type: "if-else",
          conditions: [
            {
              field: "{{trigger.record.id}}",
              operator: "equals",
              value: "rec_1",
            },
          ],
        }),
        node("yes", {
          type: "create-record",
          entity: "task",
          fields: { title: "ok" },
        }),
        node("no", {
          type: "create-record",
          entity: "note",
          fields: { body: "no" },
        }),
      ],
      [
        { source: "trigger", target: "c" },
        { source: "c", target: "yes", sourceHandle: "true" },
        { source: "c", target: "no", sourceHandle: "false" },
      ],
    );
    await runWorkflow(baseParams(definition));
    expect(prismaMock.task.create).toHaveBeenCalled();
    expect(prismaMock.note.create).not.toHaveBeenCalled();
  });

  it("send-email é pulado quando Resend não está configurado", async () => {
    resend.getResendClient.mockReturnValue(null);
    resend.getFromAddress.mockReturnValue(null);
    const definition = def(
      [
        node("e", {
          type: "send-email",
          to: "a@b.com",
          subject: "s",
          body: "b",
        }),
      ],
      [{ source: "trigger", target: "e" }],
    );
    await runWorkflow(baseParams(definition));
    expect(runRepo.setStatus).toHaveBeenLastCalledWith(
      "run_1",
      "COMPLETED",
      expect.anything(),
    );
  });

  it("node que lança marca a run como FAILED", async () => {
    prismaMock.company.create.mockRejectedValue(new Error("db down"));
    const definition = def(
      [
        node("n1", {
          type: "create-record",
          entity: "company",
          fields: { name: "Acme" },
        }),
      ],
      [{ source: "trigger", target: "n1" }],
    );
    await runWorkflow(baseParams(definition));
    expect(runRepo.updateStep).toHaveBeenCalledWith(
      "step_1",
      expect.objectContaining({ status: "FAILED", error: "db down" }),
    );
    expect(runRepo.setStatus).toHaveBeenLastCalledWith(
      "run_1",
      "FAILED",
      expect.objectContaining({ error: "db down" }),
    );
  });

  it("form pausa a run em WAITING", async () => {
    const definition = def(
      [node("form1", { type: "form", fields: [{ name: "email" }] })],
      [{ source: "trigger", target: "form1" }],
    );
    await runWorkflow(baseParams(definition));
    expect(runRepo.pause).toHaveBeenCalledWith(
      "run_1",
      expect.objectContaining({ waitingStepId: "step_1" }),
    );
    expect(runRepo.setStatus).toHaveBeenLastCalledWith("run_1", "WAITING");
  });
});

describe("resumeWorkflow", () => {
  it("completa o step pausado e processa os filhos", async () => {
    prismaMock.company.create.mockResolvedValue({ id: "co_1" });
    const definition = def(
      [
        node("form1", { type: "form", fields: [{ name: "email" }] }),
        node("after", {
          type: "create-record",
          entity: "company",
          fields: { name: "Pós-form" },
        }),
      ],
      [
        { source: "trigger", target: "form1" },
        { source: "form1", target: "after" },
      ],
    );

    await resumeWorkflow({
      runId: "run_1",
      workspaceId: "ws_1",
      actingUserId: "user_1",
      definition,
      triggerType: "launch-manually",
      triggerPayload: {},
      waitingStepId: "step_form",
      pausedNodeId: "form1",
      scope: { steps: {} },
      submission: { email: "a@b.com" },
      outputAlias: "form1",
    });

    expect(runRepo.updateStep).toHaveBeenCalledWith(
      "step_form",
      expect.objectContaining({ status: "COMPLETED" }),
    );
    expect(runRepo.clearPause).toHaveBeenCalledWith("run_1");
    expect(prismaMock.company.create).toHaveBeenCalled();
    expect(runRepo.setStatus).toHaveBeenLastCalledWith(
      "run_1",
      "COMPLETED",
      expect.anything(),
    );
  });
});
