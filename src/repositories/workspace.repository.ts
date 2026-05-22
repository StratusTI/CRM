import type { Workspace } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

type CreateWorkspaceData = {
  name: string;
  slug: string;
};

/** Acesso a dados de workspace. */
export const WorkspaceRepository = {
  /** Cria a workspace e a membership OWNER do criador numa única transação. */
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
