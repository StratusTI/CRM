import type {
  AiMessageRole,
  LandingPage,
  LandingPageMessage,
  LandingPageStatus,
  Prisma,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

/** Página com o total de acessos (do `_count`), usado nas listagens. */
export type LandingPageWithCount = LandingPage & { _count: { views: number } };

/** Visita com o título da página — base das linhas do dashboard. */
export type WorkspaceLandingView = Prisma.LandingPageViewGetPayload<{
  include: { landingPage: { select: { title: true } } };
}>;

/** Agregados crus de acesso; o mapper compõe o DTO de métricas. */
export type LandingPageMetricsRaw = {
  totalViews: number;
  avgDurationMs: number;
  totalCtaClicks: number;
  referrers: { referrer: string | null; count: number }[];
};

export type CreateLandingPageData = {
  workspaceId: string;
  createdById: string;
  title: string;
  slug: string;
  html: string;
};

export type UpdateLandingPageData = {
  updatedById: string;
  title?: string;
  slug?: string;
  html?: string;
  status?: LandingPageStatus;
  publishedAt?: Date | null;
};

export type RecordLandingEventData = {
  landingPageId: string;
  viewId: string;
  ipHash: string;
  durationMs: number;
  ctaClicks: number;
  referrer: string | null;
};

/** Acesso a dados de landing page. Sem regra de negócio — só Prisma. */
export const LandingPageRepository = {
  async create(data: CreateLandingPageData): Promise<Result<LandingPage>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const page = await prisma.landingPage.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(page);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<LandingPage | null>> {
    try {
      const page = await prisma.landingPage.findUnique({ where: { id } });
      return ok(page);
    } catch {
      return err(databaseError());
    }
  },

  /** Resolve a página publicada pelo (workspaceId, slug); ignora soft-deleted. */
  async findPublishedBySlug(
    workspaceId: string,
    slug: string,
  ): Promise<Result<LandingPage | null>> {
    try {
      const page = await prisma.landingPage.findFirst({
        where: { workspaceId, slug, deletedAt: null },
      });
      return ok(page);
    } catch {
      return err(databaseError());
    }
  },

  /** Conta páginas com o mesmo slug (para garantir unicidade, exceto a própria). */
  async slugExists(
    workspaceId: string,
    slug: string,
    exceptId?: string,
  ): Promise<Result<boolean>> {
    try {
      const found = await prisma.landingPage.findFirst({
        where: {
          workspaceId,
          slug,
          deletedAt: null,
          ...(exceptId && { id: { not: exceptId } }),
        },
        select: { id: true },
      });
      return ok(found !== null);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<LandingPageWithCount[]>> {
    try {
      const pages = await prisma.landingPage.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        include: { _count: { select: { views: true } } },
      });
      return ok(pages);
    } catch {
      return err(databaseError());
    }
  },

  /** Visitas de todas as páginas do workspace, com o título da página. */
  async listViewsByWorkspace(
    workspaceId: string,
    limit = 2000,
  ): Promise<Result<WorkspaceLandingView[]>> {
    try {
      const views = await prisma.landingPageView.findMany({
        where: { landingPage: { workspaceId, deletedAt: null } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { landingPage: { select: { title: true } } },
      });
      return ok(views);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.landingPage.updateMany({
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
    data: UpdateLandingPageData,
  ): Promise<Result<LandingPage>> {
    try {
      const page = await prisma.landingPage.update({ where: { id }, data });
      return ok(page);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<LandingPage>> {
    try {
      const page = await prisma.landingPage.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(page);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Upsert da visita por (landingPageId, viewId). Beacons sucessivos da mesma
   * sessão sobrescrevem os contadores cumulativos; `ipHash` só no create.
   */
  async recordEvent(data: RecordLandingEventData): Promise<Result<true>> {
    try {
      await prisma.landingPageView.upsert({
        where: {
          landingPageId_viewId: {
            landingPageId: data.landingPageId,
            viewId: data.viewId,
          },
        },
        create: {
          landingPageId: data.landingPageId,
          viewId: data.viewId,
          ipHash: data.ipHash,
          durationMs: data.durationMs,
          ctaClicks: data.ctaClicks,
          referrer: data.referrer,
        },
        update: {
          durationMs: data.durationMs,
          ctaClicks: data.ctaClicks,
        },
      });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  /** Agregados de acesso: total, duração média, cliques em CTA e origens. */
  async metricsFor(
    landingPageId: string,
  ): Promise<Result<LandingPageMetricsRaw>> {
    try {
      const [agg, byReferrer] = await Promise.all([
        prisma.landingPageView.aggregate({
          where: { landingPageId },
          _count: { _all: true },
          _avg: { durationMs: true },
          _sum: { ctaClicks: true },
        }),
        prisma.landingPageView.groupBy({
          by: ["referrer"],
          where: { landingPageId },
          _count: { _all: true },
          orderBy: { _count: { referrer: "desc" } },
        }),
      ]);
      return ok({
        totalViews: agg._count._all,
        avgDurationMs: Math.round(agg._avg.durationMs ?? 0),
        totalCtaClicks: agg._sum.ctaClicks ?? 0,
        referrers: byReferrer.map((r) => ({
          referrer: r.referrer,
          count: r._count._all,
        })),
      });
    } catch {
      return err(databaseError());
    }
  },

  /* ----------------------------- chat ---------------------------------- */

  async listMessages(
    landingPageId: string,
  ): Promise<Result<LandingPageMessage[]>> {
    try {
      const messages = await prisma.landingPageMessage.findMany({
        where: { landingPageId },
        orderBy: { createdAt: "asc" },
      });
      return ok(messages);
    } catch {
      return err(databaseError());
    }
  },

  async appendMessage(data: {
    landingPageId: string;
    role: AiMessageRole;
    content: string;
  }): Promise<Result<LandingPageMessage>> {
    try {
      const message = await prisma.landingPageMessage.create({ data });
      return ok(message);
    } catch {
      return err(databaseError());
    }
  },
};
