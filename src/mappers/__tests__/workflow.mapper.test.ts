import type {
  Workflow,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowVersion,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  parseDefinition,
  toWorkflowDTO,
  toWorkflowRunDTO,
  toWorkflowRunStepDTO,
  toWorkflowVersionDTO,
  triggerTypeToDto,
  triggerTypeToPrisma,
} from "@/src/mappers/workflow.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

describe("parseDefinition", () => {
  it("retorna a definição válida quando o JSON está correto", () => {
    const def = {
      trigger: { id: "trigger", position: { x: 1, y: 2 }, data: null },
      nodes: [],
      edges: [],
    };
    expect(parseDefinition(def)).toMatchObject({ nodes: [], edges: [] });
  });

  it("faz fallback para trigger vazio quando corrompido", () => {
    const def = parseDefinition({ garbage: true });
    expect(def.nodes).toEqual([]);
    expect(def.edges).toEqual([]);
    expect(def.trigger.id).toBe("trigger");
  });
});

describe("toWorkflowDTO", () => {
  const wf: Workflow = {
    id: "wf1",
    name: "Fluxo",
    description: null,
    status: "DRAFT",
    workspaceId: "w1",
    createdById: "u1",
    updatedById: null,
    activeVersionId: null,
    lastRunAt: null,
    position: 0,
    createdAt: D,
    updatedAt: D,
    deletedAt: null,
  };

  it("serializa nulos", () => {
    const dto = toWorkflowDTO(wf);
    expect(dto.lastRunAt).toBeNull();
    expect(dto.deletedAt).toBeNull();
  });

  it("serializa datas opcionais quando presentes", () => {
    const dto = toWorkflowDTO({ ...wf, lastRunAt: D, deletedAt: D });
    expect(dto.lastRunAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.deletedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("toWorkflowVersionDTO", () => {
  it("faz parse da definição", () => {
    const v: WorkflowVersion = {
      id: "v1",
      workflowId: "wf1",
      version: 1,
      status: "DRAFT",
      definition: { garbage: true },
      createdAt: D,
      updatedAt: D,
    } as WorkflowVersion;
    const dto = toWorkflowVersionDTO(v);
    expect(dto.definition.nodes).toEqual([]);
  });
});

describe("toWorkflowRunStepDTO", () => {
  it("preserva input/output e serializa datas", () => {
    const s: WorkflowRunStep = {
      id: "s1",
      runId: "r1",
      nodeId: "n1",
      nodeType: "action",
      status: "PENDING",
      input: { a: 1 },
      output: null,
      error: null,
      startedAt: null,
      finishedAt: null,
      createdAt: D,
      updatedAt: D,
    } as WorkflowRunStep;
    const dto = toWorkflowRunStepDTO(s);
    expect(dto.input).toEqual({ a: 1 });
    expect(dto.output).toBeNull();
    expect(dto.startedAt).toBeNull();
  });
});

describe("toWorkflowRunDTO", () => {
  const run: WorkflowRun & { steps?: WorkflowRunStep[] } = {
    id: "r1",
    workflowId: "wf1",
    versionId: "v1",
    status: "PENDING",
    triggerType: "LAUNCH_MANUALLY",
    triggerPayload: { x: 1 },
    state: null,
    waitingStepId: null,
    startedById: "u1",
    error: null,
    startedAt: D,
    finishedAt: null,
    createdAt: D,
    updatedAt: D,
  } as WorkflowRun;

  it("mapeia triggerType e serializa", () => {
    const dto = toWorkflowRunDTO(run);
    expect(dto.triggerType).toBe("launch-manually");
    expect(dto.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.finishedAt).toBeNull();
    expect(dto.steps).toBeUndefined();
  });

  it("mapeia steps quando presentes", () => {
    const dto = toWorkflowRunDTO({
      ...run,
      steps: [
        {
          id: "s1",
          runId: "r1",
          nodeId: "n1",
          nodeType: "action",
          status: "COMPLETED",
          input: null,
          output: null,
          error: null,
          startedAt: null,
          finishedAt: null,
          createdAt: D,
          updatedAt: D,
        } as WorkflowRunStep,
      ],
    });
    expect(dto.steps).toHaveLength(1);
  });
});

describe("triggerType round-trip", () => {
  const pairs = [
    ["RECORD_IS_CREATED", "record-is-created"],
    ["RECORD_IS_UPDATED", "record-is-updated"],
    ["RECORD_IS_DELETED", "record-is-deleted"],
    ["RECORD_IS_CREATED_OR_UPDATED", "record-is-created-or-updated"],
    ["LAUNCH_MANUALLY", "launch-manually"],
    ["ON_A_SCHEDULE", "on-a-schedule"],
    ["WEBHOOK", "webhook"],
  ] as const;

  it("converte enum ↔ kebab nos dois sentidos", () => {
    for (const [prisma, dto] of pairs) {
      expect(triggerTypeToDto(prisma)).toBe(dto);
      expect(triggerTypeToPrisma(dto)).toBe(prisma);
    }
  });
});
