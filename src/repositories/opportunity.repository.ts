import type { Opportunity, PipelineStage } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type OpportunityWithStage = Opportunity & { stage: PipelineStage };

export type CreateOpportunityData = {
  workspaceId: string;
  createdById: string;
  name: string;
  amount: number | null;
  closeDate: Date | null;
  pipelineId: string;
  stageId: string;
  companyId: string | null;
  pointOfContactId: string | null;
  ownerId: string | null;
  source: string | null;
};

export type UpdateOpportunityData = {
  updatedById: string;
  name?: string;
  amount?: number | null;
  closeDate?: Date | null;
  pipelineId?: string;
  stageId?: string;
  companyId?: string | null;
  pointOfContactId?: string | null;
  ownerId?: string | null;
  source?: string | null;
};

/** Acesso a dados de oportunidade. Sem regra de negócio — só Prisma. */
export const OpportunityRepository = {
  async create(data: CreateOpportunityData): Promise<Result<Opportunity>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const opportunity = await prisma.opportunity.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(opportunity);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Oportunidades vivas com etapa OPEN ou WON e `closeDate` definida, incluindo
   * a etapa (probability/category). Base do forecast — agregação feita em
   * memória no service (volume por workspace é modesto).
   */
  async listOpenAndWonWithStage(
    workspaceId: string,
  ): Promise<Result<OpportunityWithStage[]>> {
    try {
      const opportunities = await prisma.opportunity.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          closeDate: { not: null },
          stage: { category: { in: ["OPEN", "WON"] } },
        },
        include: { stage: true },
      });
      return ok(opportunities);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Opportunity | null>> {
    try {
      const opportunity = await prisma.opportunity.findUnique({
        where: { id },
      });
      return ok(opportunity);
    } catch {
      return err(databaseError());
    }
  },

  async existsInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.opportunity.count({
        where: { id, workspaceId, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Opportunity[]>> {
    try {
      const opportunities = await prisma.opportunity.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(opportunities);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.opportunity.updateMany({
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

  async update(
    id: string,
    data: UpdateOpportunityData,
  ): Promise<Result<Opportunity>> {
    try {
      const opportunity = await prisma.opportunity.update({
        where: { id },
        data,
      });
      return ok(opportunity);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<Opportunity>> {
    try {
      const opportunity = await prisma.opportunity.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(opportunity);
    } catch {
      return err(databaseError());
    }
  },
};
