import type { Prisma, Workspace } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import {
  makeShareToken,
  SEED_DASHBOARDS,
  SEED_DOCUMENTS,
  SEED_PIPELINE_NAME,
  SEED_PIPELINE_STAGES,
} from "@/src/services/workspace-seed-data";

type CreateWorkspaceData = {
  name: string;
  slug: string;
};

/** Acesso a dados de workspace. */
export const WorkspaceRepository = {
  /**
   * Cria a workspace e a membership OWNER do criador numa única transação,
   * já semeando 2 documentos e 2 dashboards de exemplo (ver
   * `workspace-seed-data`) para o usuário ver as funcionalidades em uso.
   */
  async createWithOwner(
    data: CreateWorkspaceData,
    ownerId: string,
  ): Promise<Result<Workspace>> {
    try {
      const workspace = await prisma.workspace.create({
        data: {
          name: data.name,
          slug: data.slug,
          memberships: {
            create: { userId: ownerId, role: "OWNER" },
          },
          pipelines: {
            create: {
              name: SEED_PIPELINE_NAME,
              isDefault: true,
              position: 1,
              createdBy: { connect: { id: ownerId } },
              stages: {
                create: SEED_PIPELINE_STAGES.map((stage, index) => ({
                  name: stage.name,
                  probability: stage.probability,
                  category: stage.category,
                  color: stage.color,
                  position: index + 1,
                })),
              },
            },
          },
          proposals: {
            create: SEED_DOCUMENTS.map((doc) => ({
              title: doc.title,
              content: doc.content,
              type: doc.type,
              shareToken: makeShareToken(),
              createdBy: { connect: { id: ownerId } },
            })),
          },
          dashboards: {
            create: SEED_DASHBOARDS.map((dashboard, index) => ({
              title: dashboard.title,
              position: index + 1,
              createdBy: { connect: { id: ownerId } },
              widgets: {
                create: dashboard.widgets.map((widget) => ({
                  type: widget.type,
                  x: widget.x,
                  y: widget.y,
                  w: widget.w,
                  h: widget.h,
                  config: widget.config as Prisma.InputJsonValue,
                })),
              },
            })),
          },
        },
      });
      return ok(workspace);
    } catch {
      return err(databaseError());
    }
  },

  async findBySlug(slug: string): Promise<Result<Workspace | null>> {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { slug } });
      return ok(workspace);
    } catch {
      return err(databaseError());
    }
  },

  async existsBySlug(slug: string): Promise<Result<boolean>> {
    try {
      const count = await prisma.workspace.count({ where: { slug } });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /** Workspaces das quais o usuário é membro, da mais antiga para a recente. */
  async listByUserId(userId: string): Promise<Result<Workspace[]>> {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: { memberships: { some: { userId } } },
        orderBy: { createdAt: "asc" },
      });
      return ok(workspaces);
    } catch {
      return err(databaseError());
    }
  },
};
