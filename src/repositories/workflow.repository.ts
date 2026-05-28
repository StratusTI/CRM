import type {
  Prisma,
  Workflow,
  WorkflowStatus,
  WorkflowVersion,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import type { WorkflowDefinition } from "@/src/schemas/workflow.schema";

export type CreateWorkflowData = {
  workspaceId: string;
  createdById: string;
  name: string;
  description: string | null;
  /** Definition do draft inicial — geralmente trigger vazio. */
  initialDefinition: WorkflowDefinition;
};

export type UpdateWorkflowData = {
  updatedById: string;
  name?: string;
  description?: string | null;
  status?: WorkflowStatus;
  activeVersionId?: string | null;
  lastRunAt?: Date | null;
};

export type WorkflowWithDraft = Workflow & { versions: WorkflowVersion[] };

/** Acesso a dados de Workflow + criação do primeiro WorkflowVersion (DRAFT). */
export const WorkflowRepository = {
  async create(data: CreateWorkflowData): Promise<Result<WorkflowWithDraft>> {
    try {
      const created = await prisma.workflow.create({
        data: {
          name: data.name,
          description: data.description,
          workspace: { connect: { id: data.workspaceId } },
          createdBy: { connect: { id: data.createdById } },
          versions: {
            create: {
              version: 1,
              status: "DRAFT",
              definition:
                data.initialDefinition as unknown as Prisma.JsonObject,
            },
          },
        },
        include: { versions: true },
      });
      return ok(created);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Workflow | null>> {
    try {
      const wf = await prisma.workflow.findUnique({ where: { id } });
      return ok(wf);
    } catch {
      return err(databaseError());
    }
  },

  async findByIdWithVersions(
    id: string,
  ): Promise<Result<WorkflowWithDraft | null>> {
    try {
      const wf = await prisma.workflow.findUnique({
        where: { id },
        include: { versions: { orderBy: { version: "desc" } } },
      });
      return ok(wf);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Workflow[]>> {
    try {
      const list = await prisma.workflow.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async existsInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.workflow.count({
        where: { id, workspaceId, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: UpdateWorkflowData,
  ): Promise<Result<Workflow>> {
    try {
      const wf = await prisma.workflow.update({ where: { id }, data });
      return ok(wf);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Workflow>> {
    try {
      const wf = await prisma.workflow.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: "DEACTIVATED",
          updatedById,
        },
      });
      return ok(wf);
    } catch {
      return err(databaseError());
    }
  },

  /** Triggers ativos pra dispatch de record-is-*. Carrega versão ativa. */
  async findActiveByEntity(
    workspaceId: string,
  ): Promise<
    Result<Array<Workflow & { activeVersion: WorkflowVersion | null }>>
  > {
    try {
      const list = await prisma.workflow.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          status: "ACTIVE",
          activeVersionId: { not: null },
        },
        include: { activeVersion: true },
      });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  /** Cross-workspace: todos os workflows ACTIVE — usado pelo scheduler. */
  async findAllActive(): Promise<
    Result<Array<Workflow & { activeVersion: WorkflowVersion | null }>>
  > {
    try {
      const list = await prisma.workflow.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          activeVersionId: { not: null },
        },
        include: { activeVersion: true },
      });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async findActiveByWebhookToken(
    token: string,
  ): Promise<
    Result<(Workflow & { activeVersion: WorkflowVersion | null }) | null>
  > {
    try {
      // Buscamos workflows ativos e filtramos em memória pelo token do trigger
      // no JSON da versão ativa. O volume é pequeno (workflows ativos por org).
      const list = await prisma.workflow.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          activeVersionId: { not: null },
        },
        include: { activeVersion: true },
      });
      const match = list.find((wf) => {
        const trigger = (wf.activeVersion?.definition as { trigger?: unknown })
          ?.trigger as { data?: { type?: string; token?: string } } | undefined;
        return (
          trigger?.data?.type === "webhook" && trigger.data.token === token
        );
      });
      return ok(match ?? null);
    } catch {
      return err(databaseError());
    }
  },
};
