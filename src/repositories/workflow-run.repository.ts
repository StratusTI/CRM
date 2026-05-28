import type {
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowRunStep,
  WorkflowRunStepStatus,
  WorkflowTriggerType,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateWorkflowRunData = {
  workflowId: string;
  versionId: string;
  triggerType: WorkflowTriggerType;
  triggerPayload: Prisma.InputJsonValue;
  startedById: string | null;
};

export type CreateRunStepData = {
  runId: string;
  nodeId: string;
  nodeType: string;
  status?: WorkflowRunStepStatus;
  input?: Prisma.InputJsonValue;
};

export type UpdateRunStepData = {
  status?: WorkflowRunStepStatus;
  output?: Prisma.InputJsonValue;
  error?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export const WorkflowRunRepository = {
  async create(data: CreateWorkflowRunData): Promise<Result<WorkflowRun>> {
    try {
      const run = await prisma.workflowRun.create({
        data: {
          workflow: { connect: { id: data.workflowId } },
          version: { connect: { id: data.versionId } },
          triggerType: data.triggerType,
          triggerPayload: data.triggerPayload,
          startedBy: data.startedById
            ? { connect: { id: data.startedById } }
            : undefined,
        },
      });
      return ok(run);
    } catch {
      return err(databaseError());
    }
  },

  async findById(
    id: string,
  ): Promise<Result<(WorkflowRun & { steps: WorkflowRunStep[] }) | null>> {
    try {
      const run = await prisma.workflowRun.findUnique({
        where: { id },
        include: { steps: { orderBy: { createdAt: "asc" } } },
      });
      return ok(run);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkflow(
    workflowId: string,
    limit = 50,
  ): Promise<Result<WorkflowRun[]>> {
    try {
      const list = await prisma.workflowRun.findMany({
        where: { workflowId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async setStatus(
    id: string,
    status: WorkflowRunStatus,
    extra: { error?: string | null; finishedAt?: Date | null } = {},
  ): Promise<Result<WorkflowRun>> {
    try {
      const run = await prisma.workflowRun.update({
        where: { id },
        data: {
          status,
          error: extra.error,
          finishedAt: extra.finishedAt,
          startedAt: status === "RUNNING" ? new Date() : undefined,
        },
      });
      return ok(run);
    } catch {
      return err(databaseError());
    }
  },

  async createStep(data: CreateRunStepData): Promise<Result<WorkflowRunStep>> {
    try {
      const step = await prisma.workflowRunStep.create({
        data: {
          runId: data.runId,
          nodeId: data.nodeId,
          nodeType: data.nodeType,
          status: data.status ?? "PENDING",
          input: data.input,
        },
      });
      return ok(step);
    } catch {
      return err(databaseError());
    }
  },

  async updateStep(
    id: string,
    data: UpdateRunStepData,
  ): Promise<Result<WorkflowRunStep>> {
    try {
      const step = await prisma.workflowRunStep.update({
        where: { id },
        data,
      });
      return ok(step);
    } catch {
      return err(databaseError());
    }
  },

  /** Marca run como pausado em um form: persiste scope e o step alvo. */
  async pause(
    id: string,
    data: { state: Prisma.InputJsonValue; waitingStepId: string },
  ): Promise<Result<WorkflowRun>> {
    try {
      const run = await prisma.workflowRun.update({
        where: { id },
        data: { state: data.state, waitingStepId: data.waitingStepId },
      });
      return ok(run);
    } catch {
      return err(databaseError());
    }
  },

  async clearPause(id: string): Promise<Result<WorkflowRun>> {
    try {
      const run = await prisma.workflowRun.update({
        where: { id },
        data: { state: Prisma.DbNull, waitingStepId: null },
      });
      return ok(run);
    } catch {
      return err(databaseError());
    }
  },
};
