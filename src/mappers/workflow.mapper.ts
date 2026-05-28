import type {
  Workflow,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowVersion,
} from "@prisma/client";
import {
  type WorkflowDefinition,
  WorkflowDefinitionSchema,
  type WorkflowDTO,
  type WorkflowRunDTO,
  type WorkflowRunStepDTO,
  type WorkflowVersionDTO,
} from "@/src/schemas/workflow.schema";

/**
 * Coerce do JSON cru pra `WorkflowDefinition`. Validamos com Zod —
 * se o JSON estiver corrompido, fallback pra trigger vazio (não quebra a UI).
 */
export function parseDefinition(input: unknown): WorkflowDefinition {
  const parsed = WorkflowDefinitionSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return {
    trigger: { id: "trigger", position: { x: 0, y: 0 }, data: null },
    nodes: [],
    edges: [],
  };
}

export function toWorkflowDTO(wf: Workflow): WorkflowDTO {
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    status: wf.status,
    workspaceId: wf.workspaceId,
    createdById: wf.createdById,
    updatedById: wf.updatedById,
    activeVersionId: wf.activeVersionId,
    lastRunAt: wf.lastRunAt === null ? null : wf.lastRunAt.toISOString(),
    createdAt: wf.createdAt.toISOString(),
    updatedAt: wf.updatedAt.toISOString(),
    deletedAt: wf.deletedAt === null ? null : wf.deletedAt.toISOString(),
  };
}

export function toWorkflowVersionDTO(v: WorkflowVersion): WorkflowVersionDTO {
  return {
    id: v.id,
    workflowId: v.workflowId,
    status: v.status,
    version: v.version,
    definition: parseDefinition(v.definition),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export function toWorkflowRunStepDTO(s: WorkflowRunStep): WorkflowRunStepDTO {
  return {
    id: s.id,
    runId: s.runId,
    nodeId: s.nodeId,
    nodeType: s.nodeType,
    status: s.status,
    input: s.input ?? null,
    output: s.output ?? null,
    error: s.error,
    startedAt: s.startedAt === null ? null : s.startedAt.toISOString(),
    finishedAt: s.finishedAt === null ? null : s.finishedAt.toISOString(),
  };
}

export function toWorkflowRunDTO(
  run: WorkflowRun & { steps?: WorkflowRunStep[] },
): WorkflowRunDTO {
  return {
    id: run.id,
    workflowId: run.workflowId,
    versionId: run.versionId,
    status: run.status,
    triggerType: triggerTypeToDto(run.triggerType),
    triggerPayload: run.triggerPayload ?? null,
    waitingStepId: run.waitingStepId,
    startedById: run.startedById,
    error: run.error,
    startedAt: run.startedAt === null ? null : run.startedAt.toISOString(),
    finishedAt: run.finishedAt === null ? null : run.finishedAt.toISOString(),
    createdAt: run.createdAt.toISOString(),
    steps: run.steps?.map(toWorkflowRunStepDTO),
  };
}

/** Enum Prisma (UPPER_SNAKE) → string da DTO (kebab-case). */
export function triggerTypeToDto(
  type: WorkflowRun["triggerType"],
): WorkflowRunDTO["triggerType"] {
  switch (type) {
    case "RECORD_IS_CREATED":
      return "record-is-created";
    case "RECORD_IS_UPDATED":
      return "record-is-updated";
    case "RECORD_IS_DELETED":
      return "record-is-deleted";
    case "RECORD_IS_CREATED_OR_UPDATED":
      return "record-is-created-or-updated";
    case "LAUNCH_MANUALLY":
      return "launch-manually";
    case "ON_A_SCHEDULE":
      return "on-a-schedule";
    case "WEBHOOK":
      return "webhook";
  }
}

/** Reverso: DTO (kebab) → enum Prisma. */
export function triggerTypeToPrisma(
  type: WorkflowRunDTO["triggerType"],
): WorkflowRun["triggerType"] {
  switch (type) {
    case "record-is-created":
      return "RECORD_IS_CREATED";
    case "record-is-updated":
      return "RECORD_IS_UPDATED";
    case "record-is-deleted":
      return "RECORD_IS_DELETED";
    case "record-is-created-or-updated":
      return "RECORD_IS_CREATED_OR_UPDATED";
    case "launch-manually":
      return "LAUNCH_MANUALLY";
    case "on-a-schedule":
      return "ON_A_SCHEDULE";
    case "webhook":
      return "WEBHOOK";
  }
}
