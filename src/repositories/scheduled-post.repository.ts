import {
  Prisma,
  type ScheduledMediaKind,
  type ScheduledPost,
  type ScheduledPostStatus,
  type ScheduledPostTarget,
  type ScheduledPostTargetStatus,
  type SocialPlatform,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import type { ScheduledPostWithRelations } from "@/src/mappers/scheduled-post.mapper";

export type CreateScheduledPostData = {
  workspaceId: string;
  createdById: string;
  content: string;
  title: string | null;
  options: Prisma.InputJsonValue | null;
  // null vira Prisma.JsonNull na escrita (campo Json opcional).
  status: ScheduledPostStatus;
  scheduledFor: Date;
};

export type TargetSeed = { platform: SocialPlatform };

export type MediaSeed = {
  kind: ScheduledMediaKind;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  order: number;
};

export type TargetUpdate = {
  status?: ScheduledPostTargetStatus;
  externalPostId?: string | null;
  error?: string | null;
  attempts?: number;
  publishedAt?: Date | null;
};

const withRelations = {
  targets: { orderBy: { platform: "asc" } },
  media: { orderBy: { order: "asc" } },
} satisfies Prisma.ScheduledPostInclude;

export const ScheduledPostRepository = {
  /** Cria post + alvos + mídia em uma transação (tudo ou nada). */
  async create(
    data: CreateScheduledPostData,
    targets: TargetSeed[],
    media: MediaSeed[],
  ): Promise<Result<ScheduledPostWithRelations>> {
    try {
      const post = await prisma.$transaction(async (tx) => {
        const created = await tx.scheduledPost.create({
          data: { ...data, options: data.options ?? Prisma.JsonNull },
        });
        if (targets.length > 0) {
          await tx.scheduledPostTarget.createMany({
            data: targets.map((t) => ({
              postId: created.id,
              platform: t.platform,
            })),
          });
        }
        if (media.length > 0) {
          await tx.scheduledPostMedia.createMany({
            data: media.map((m) => ({ postId: created.id, ...m })),
          });
        }
        return tx.scheduledPost.findUniqueOrThrow({
          where: { id: created.id },
          include: withRelations,
        });
      });
      return ok(post);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<ScheduledPostWithRelations[]>> {
    try {
      const posts = await prisma.scheduledPost.findMany({
        where: { workspaceId },
        include: withRelations,
        orderBy: [{ scheduledFor: "desc" }],
      });
      return ok(posts);
    } catch {
      return err(databaseError());
    }
  },

  async findById(
    id: string,
  ): Promise<Result<ScheduledPostWithRelations | null>> {
    try {
      const post = await prisma.scheduledPost.findUnique({
        where: { id },
        include: withRelations,
      });
      return ok(post);
    } catch {
      return err(databaseError());
    }
  },

  /** Agendamentos vencidos prontos para publicar (status SCHEDULED). */
  async findDue(
    now: Date,
    limit = 25,
  ): Promise<Result<ScheduledPostWithRelations[]>> {
    try {
      const posts = await prisma.scheduledPost.findMany({
        where: { status: "SCHEDULED", scheduledFor: { lte: now } },
        include: withRelations,
        orderBy: [{ scheduledFor: "asc" }],
        take: limit,
      });
      return ok(posts);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Marca o post como PUBLISHING de forma atômica — só vence se ainda estiver
   * SCHEDULED. Garante que dois ticks concorrentes não publiquem o mesmo post.
   * Retorna `true` se este chamador "ganhou" a corrida.
   */
  async claim(id: string): Promise<Result<boolean>> {
    try {
      const res = await prisma.scheduledPost.updateMany({
        where: { id, status: "SCHEDULED" },
        data: { status: "PUBLISHING" },
      });
      return ok(res.count === 1);
    } catch {
      return err(databaseError());
    }
  },

  async updateStatus(
    id: string,
    status: ScheduledPostStatus,
    fields: { publishedAt?: Date | null; lastError?: string | null } = {},
  ): Promise<Result<ScheduledPost>> {
    try {
      const post = await prisma.scheduledPost.update({
        where: { id },
        data: { status, ...fields },
      });
      return ok(post);
    } catch {
      return err(databaseError());
    }
  },

  async reschedule(
    id: string,
    scheduledFor: Date,
  ): Promise<Result<ScheduledPost>> {
    try {
      const post = await prisma.scheduledPost.update({
        where: { id },
        data: { scheduledFor, status: "SCHEDULED", lastError: null },
      });
      return ok(post);
    } catch {
      return err(databaseError());
    }
  },

  async updateTarget(
    id: string,
    update: TargetUpdate,
  ): Promise<Result<ScheduledPostTarget>> {
    try {
      const target = await prisma.scheduledPostTarget.update({
        where: { id },
        data: update,
      });
      return ok(target);
    } catch {
      return err(databaseError());
    }
  },

  /** Cancela o post e seus alvos ainda pendentes. */
  async cancel(id: string): Promise<Result<ScheduledPost>> {
    try {
      const post = await prisma.$transaction(async (tx) => {
        await tx.scheduledPostTarget.updateMany({
          where: { postId: id, status: { in: ["PENDING", "PUBLISHING"] } },
          data: { status: "CANCELED" },
        });
        return tx.scheduledPost.update({
          where: { id },
          data: { status: "CANCELED" },
        });
      });
      return ok(post);
    } catch {
      return err(databaseError());
    }
  },
};
