import type {
  Prisma,
  Workflow,
  WorkflowRun,
  WorkflowVersion,
} from "@prisma/client";
import type { WorkflowDefinition } from "@/src/schemas/workflow.schema";

type WorkflowOverrides = Partial<
  Omit<Prisma.WorkflowCreateInput, "workspace" | "createdBy" | "versions">
>;

type WorkflowVersionOverrides = Partial<
  Omit<Prisma.WorkflowVersionCreateInput, "workflow" | "definition">
> & {
  definition?: WorkflowDefinition;
};

type WorkflowRunOverrides = Partial<
  Omit<Prisma.WorkflowRunCreateInput, "workflow" | "version">
>;

/** Definition mínima válida (trigger vazio, sem nodes/edges). */
export function emptyDefinition(): WorkflowDefinition {
  return {
    trigger: { id: "trigger", position: { x: 0, y: 0 }, data: null },
    nodes: [],
    edges: [],
  };
}

export async function createWorkflow(
  workspaceId: string,
  createdById: string,
  overrides: WorkflowOverrides = {},
): Promise<Workflow> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.workflow.create({
    data: {
      name: overrides.name ?? "Onboarding flow",
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}

export async function createWorkflowVersion(
  workflowId: string,
  overrides: WorkflowVersionOverrides = {},
): Promise<WorkflowVersion> {
  const { prisma } = await import("@/src/lib/prisma");
  const { definition, ...rest } = overrides;
  return prisma.workflowVersion.create({
    data: {
      version: rest.version ?? 1,
      status: rest.status ?? "DRAFT",
      definition: (definition ??
        emptyDefinition()) as unknown as Prisma.JsonObject,
      ...rest,
      workflow: { connect: { id: workflowId } },
    },
  });
}

export async function createWorkflowRun(
  workflowId: string,
  versionId: string,
  overrides: WorkflowRunOverrides = {},
): Promise<WorkflowRun> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.workflowRun.create({
    data: {
      status: overrides.status ?? "PENDING",
      triggerType: overrides.triggerType ?? "LAUNCH_MANUALLY",
      triggerPayload:
        (overrides.triggerPayload as Prisma.InputJsonValue | undefined) ?? {},
      ...overrides,
      workflow: { connect: { id: workflowId } },
      version: { connect: { id: versionId } },
    },
  });
}
