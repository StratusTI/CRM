import type { SocialPlatform, TrackedCompetitor } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateCompetitorData = {
  workspaceId: string;
  createdById: string;
  platform: SocialPlatform;
  handle: string;
  profileUrl: string | null;
  followersCount: number | null;
  notes: string | null;
};

export type UpdateCompetitorData = {
  updatedById: string;
  platform?: SocialPlatform;
  handle?: string;
  profileUrl?: string | null;
  followersCount?: number | null;
  notes?: string | null;
};

/** Acesso a dados de concorrente rastreado. Sem regra de negócio — só Prisma. */
export const CompetitorRepository = {
  async create(data: CreateCompetitorData): Promise<Result<TrackedCompetitor>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const competitor = await prisma.trackedCompetitor.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(competitor);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<TrackedCompetitor | null>> {
    try {
      const competitor = await prisma.trackedCompetitor.findUnique({
        where: { id },
      });
      return ok(competitor);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<TrackedCompetitor[]>> {
    try {
      const competitors = await prisma.trackedCompetitor.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(competitors);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.trackedCompetitor.updateMany({
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
    data: UpdateCompetitorData,
  ): Promise<Result<TrackedCompetitor>> {
    try {
      const competitor = await prisma.trackedCompetitor.update({
        where: { id },
        data,
      });
      return ok(competitor);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<TrackedCompetitor>> {
    try {
      const competitor = await prisma.trackedCompetitor.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(competitor);
    } catch {
      return err(databaseError());
    }
  },
};
