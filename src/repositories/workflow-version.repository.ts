import type { Prisma, WorkflowVersion } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import type { WorkflowDefinition } from "@/src/schemas/workflow.schema";

export const WorkflowVersionRepository = {
  async findById(id: string): Promise<Result<WorkflowVersion | null>> {
    try {
      const version = await prisma.workflowVersion.findUnique({
        where: { id },
      });
      return ok(version);
    } catch {
      return err(databaseError());
    }
  },

  async findDraft(workflowId: string): Promise<Result<WorkflowVersion | null>> {
    try {
      const version = await prisma.workflowVersion.findFirst({
        where: { workflowId, status: "DRAFT" },
        orderBy: { version: "desc" },
      });
      return ok(version);
    } catch {
      return err(databaseError());
    }
  },

  async findActive(
    workflowId: string,
  ): Promise<Result<WorkflowVersion | null>> {
    try {
      const version = await prisma.workflowVersion.findFirst({
        where: { workflowId, status: "ACTIVE" },
        orderBy: { version: "desc" },
      });
      return ok(version);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkflow(workflowId: string): Promise<Result<WorkflowVersion[]>> {
    try {
      const list = await prisma.workflowVersion.findMany({
        where: { workflowId },
        orderBy: { version: "desc" },
      });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async updateDefinition(
    id: string,
    definition: WorkflowDefinition,
  ): Promise<Result<WorkflowVersion>> {
    try {
      const updated = await prisma.workflowVersion.update({
        where: { id },
        data: { definition: definition as unknown as Prisma.JsonObject },
      });
      return ok(updated);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Activate: arquiva a versão ACTIVE atual e promove o DRAFT para ACTIVE.
   * Cria um novo DRAFT vazio espelhando o `definition` recém-ativado pra que
   * o usuário continue editando sem perder o estado. Retorna a versão ativada.
   */
  async activateDraft(
    workflowId: string,
    draftId: string,
  ): Promise<
    Result<{ activated: WorkflowVersion; newDraft: WorkflowVersion }>
  > {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const draft = await tx.workflowVersion.findUnique({
          where: { id: draftId },
        });
        if (
          !draft ||
          draft.workflowId !== workflowId ||
          draft.status !== "DRAFT"
        ) {
          throw new Error("draft-invalid");
        }
        await tx.workflowVersion.updateMany({
          where: { workflowId, status: "ACTIVE" },
          data: { status: "ARCHIVED" },
        });
        const activated = await tx.workflowVersion.update({
          where: { id: draftId },
          data: { status: "ACTIVE" },
        });
        const nextVersionNumber = activated.version + 1;
        const newDraft = await tx.workflowVersion.create({
          data: {
            workflowId,
            version: nextVersionNumber,
            status: "DRAFT",
            definition: activated.definition as Prisma.InputJsonValue,
          },
        });
        await tx.workflow.update({
          where: { id: workflowId },
          data: { status: "ACTIVE", activeVersionId: activated.id },
        });
        return { activated, newDraft };
      });
      return ok(result);
    } catch {
      return err(databaseError());
    }
  },

  /** Discard: descarta as alterações no draft, copiando de volta da versão ACTIVE. */
  async discardDraft(workflowId: string): Promise<Result<WorkflowVersion>> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const active = await tx.workflowVersion.findFirst({
          where: { workflowId, status: "ACTIVE" },
        });
        const draft = await tx.workflowVersion.findFirst({
          where: { workflowId, status: "DRAFT" },
          orderBy: { version: "desc" },
        });
        if (!draft) throw new Error("draft-missing");
        const definition = active
          ? (active.definition as Prisma.InputJsonValue)
          : ({
              trigger: { id: "trigger", position: { x: 0, y: 0 }, data: null },
              nodes: [],
              edges: [],
            } as Prisma.InputJsonValue);
        return tx.workflowVersion.update({
          where: { id: draft.id },
          data: { definition },
        });
      });
      return ok(result);
    } catch {
      return err(databaseError());
    }
  },
};
