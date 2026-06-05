import type { Pipeline, PipelineStage, StageCategory } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type PipelineWithStages = Pipeline & { stages: PipelineStage[] };

export type StageData = {
  id?: string;
  name: string;
  probability: number;
  category: StageCategory;
  color: string | null;
};

export type CreatePipelineData = {
  workspaceId: string;
  createdById: string;
  name: string;
  isDefault?: boolean;
  stages: StageData[];
};

/** Acesso a dados de pipeline/etapas. Sem regra de negócio — só Prisma. */
export const PipelineRepository = {
  async create(data: CreatePipelineData): Promise<Result<PipelineWithStages>> {
    try {
      const last = await prisma.pipeline.findFirst({
        where: { workspaceId: data.workspaceId, deletedAt: null },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const pipeline = await prisma.pipeline.create({
        data: {
          workspaceId: data.workspaceId,
          createdById: data.createdById,
          name: data.name,
          isDefault: data.isDefault ?? false,
          position: (last?.position ?? 0) + 1,
          stages: {
            create: data.stages.map((stage, index) => ({
              name: stage.name,
              probability: stage.probability,
              category: stage.category,
              color: stage.color,
              position: index + 1,
            })),
          },
        },
        include: { stages: true },
      });
      return ok(pipeline);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<PipelineWithStages[]>> {
    try {
      const pipelines = await prisma.pipeline.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { stages: { orderBy: { position: "asc" } } },
      });
      return ok(pipelines);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<PipelineWithStages | null>> {
    try {
      const pipeline = await prisma.pipeline.findUnique({
        where: { id },
        include: { stages: { orderBy: { position: "asc" } } },
      });
      return ok(pipeline);
    } catch {
      return err(databaseError());
    }
  },

  /** Pipeline padrão da workspace (com etapas ordenadas), se existir. */
  async findDefault(
    workspaceId: string,
  ): Promise<Result<PipelineWithStages | null>> {
    try {
      const pipeline = await prisma.pipeline.findFirst({
        where: { workspaceId, isDefault: true, deletedAt: null },
        include: { stages: { orderBy: { position: "asc" } } },
      });
      return ok(pipeline);
    } catch {
      return err(databaseError());
    }
  },

  async existsInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.pipeline.count({
        where: { id, workspaceId, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /** Verifica que a etapa pertence ao pipeline informado e à workspace. */
  async stageBelongsTo(
    stageId: string,
    pipelineId: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.pipelineStage.count({
        where: {
          id: stageId,
          pipelineId,
          pipeline: { workspaceId, deletedAt: null },
        },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /** Quantas oportunidades (vivas) referenciam o pipeline. */
  async countOpportunities(pipelineId: string): Promise<Result<number>> {
    try {
      const count = await prisma.opportunity.count({
        where: { pipelineId, deletedAt: null },
      });
      return ok(count);
    } catch {
      return err(databaseError());
    }
  },

  /** Dentre `stageIds`, devolve os que têm oportunidades (vivas) vinculadas. */
  async stagesInUse(stageIds: string[]): Promise<Result<string[]>> {
    if (stageIds.length === 0) return ok([]);
    try {
      const rows = await prisma.opportunity.groupBy({
        by: ["stageId"],
        where: { stageId: { in: stageIds }, deletedAt: null },
      });
      return ok(rows.map((r) => r.stageId));
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Atualiza nome do pipeline e sincroniza etapas numa transação:
   * etapas com `id` são atualizadas, sem `id` criadas, e as ausentes removidas.
   * O chamador (service) já garantiu que etapas removidas não têm oportunidades.
   */
  async update(
    id: string,
    data: {
      updatedById: string;
      name?: string;
      stages?: StageData[];
      removedStageIds?: string[];
    },
  ): Promise<Result<PipelineWithStages>> {
    try {
      const pipeline = await prisma.$transaction(async (tx) => {
        await tx.pipeline.update({
          where: { id },
          data: {
            updatedById: data.updatedById,
            ...(data.name !== undefined && { name: data.name }),
          },
        });

        if (data.stages) {
          if (data.removedStageIds && data.removedStageIds.length > 0) {
            await tx.pipelineStage.deleteMany({
              where: { id: { in: data.removedStageIds }, pipelineId: id },
            });
          }
          for (const [index, stage] of data.stages.entries()) {
            if (stage.id) {
              await tx.pipelineStage.update({
                where: { id: stage.id },
                data: {
                  name: stage.name,
                  probability: stage.probability,
                  category: stage.category,
                  color: stage.color,
                  position: index + 1,
                },
              });
            } else {
              await tx.pipelineStage.create({
                data: {
                  pipelineId: id,
                  name: stage.name,
                  probability: stage.probability,
                  category: stage.category,
                  color: stage.color,
                  position: index + 1,
                },
              });
            }
          }
        }

        return tx.pipeline.findUniqueOrThrow({
          where: { id },
          include: { stages: { orderBy: { position: "asc" } } },
        });
      });
      return ok(pipeline);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.pipeline.updateMany({
            where: { id, workspaceId, deletedAt: null },
            data: { position: index + 1 },
          }),
        ),
      );
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Pipeline>> {
    try {
      const pipeline = await prisma.pipeline.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(pipeline);
    } catch {
      return err(databaseError());
    }
  },
};
