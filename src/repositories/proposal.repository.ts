import type {
  DocumentType,
  Proposal,
  ProposalStatus,
  ProposalView,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

/** Proposta com o total de visitas (do `_count`), usado nas listagens. */
export type ProposalWithCount = Proposal & { _count: { views: number } };

/** Agregados crus de leitura; o mapper compõe o DTO (completionRate etc.). */
export type ProposalMetricsRaw = {
  totalViews: number;
  uniqueVisitors: number;
  completed: number;
  avgDurationMs: number;
  views: ProposalView[];
};

export type CreateProposalData = {
  workspaceId: string;
  createdById: string;
  title: string;
  content: string;
  type: DocumentType;
  shareToken: string;
};

export type UpdateProposalData = {
  updatedById: string;
  title?: string;
  content?: string;
  type?: DocumentType;
  status?: ProposalStatus;
  publishedAt?: Date | null;
};

export type RecordViewData = {
  proposalId: string;
  viewId: string;
  ipHash: string;
  durationMs: number;
  reachedEnd: boolean;
  scrolledPct: number;
  referrer: string | null;
};

/** Acesso a dados de proposta. Sem regra de negócio — só Prisma. */
export const ProposalRepository = {
  async create(data: CreateProposalData): Promise<Result<Proposal>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const proposal = await prisma.proposal.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(proposal);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Proposal | null>> {
    try {
      const proposal = await prisma.proposal.findUnique({ where: { id } });
      return ok(proposal);
    } catch {
      return err(databaseError());
    }
  },

  /** Resolve a proposta pelo token público (ignora soft-deleted). */
  async findByShareToken(token: string): Promise<Result<Proposal | null>> {
    try {
      const proposal = await prisma.proposal.findFirst({
        where: { shareToken: token, deletedAt: null },
      });
      return ok(proposal);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<ProposalWithCount[]>> {
    try {
      const proposals = await prisma.proposal.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        include: { _count: { select: { views: true } } },
      });
      return ok(proposals);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.proposal.updateMany({
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
    data: UpdateProposalData,
  ): Promise<Result<Proposal>> {
    try {
      const proposal = await prisma.proposal.update({ where: { id }, data });
      return ok(proposal);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Proposal>> {
    try {
      const proposal = await prisma.proposal.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(proposal);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Upsert da visita por (proposalId, viewId). Beacons sucessivos da mesma
   * sessão sobrescrevem os contadores cumulativos; `ipHash` só no create.
   */
  async recordView(data: RecordViewData): Promise<Result<ProposalView>> {
    try {
      const view = await prisma.proposalView.upsert({
        where: {
          proposalId_viewId: {
            proposalId: data.proposalId,
            viewId: data.viewId,
          },
        },
        create: {
          proposalId: data.proposalId,
          viewId: data.viewId,
          ipHash: data.ipHash,
          durationMs: data.durationMs,
          reachedEnd: data.reachedEnd,
          scrolledPct: data.scrolledPct,
          referrer: data.referrer,
        },
        update: {
          durationMs: data.durationMs,
          reachedEnd: data.reachedEnd,
          scrolledPct: data.scrolledPct,
        },
      });
      return ok(view);
    } catch {
      return err(databaseError());
    }
  },

  /** Agregados de leitura + lista recente das visitas (cap de 200). */
  async metricsFor(proposalId: string): Promise<Result<ProposalMetricsRaw>> {
    try {
      const [agg, completed, uniques, views] = await Promise.all([
        prisma.proposalView.aggregate({
          where: { proposalId },
          _count: { _all: true },
          _avg: { durationMs: true },
        }),
        prisma.proposalView.count({ where: { proposalId, reachedEnd: true } }),
        prisma.proposalView.groupBy({ by: ["ipHash"], where: { proposalId } }),
        prisma.proposalView.findMany({
          where: { proposalId },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);
      return ok({
        totalViews: agg._count._all,
        uniqueVisitors: uniques.length,
        completed,
        avgDurationMs: Math.round(agg._avg.durationMs ?? 0),
        views,
      });
    } catch {
      return err(databaseError());
    }
  },
};
