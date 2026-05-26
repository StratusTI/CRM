import type { Prisma, WorkspaceInvite } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type WorkspaceInviteWithWorkspace = Prisma.WorkspaceInviteGetPayload<{
  include: { workspace: true };
}>;

type CreateData = {
  workspaceId: string;
  createdById: string;
  token: string;
  role: "MEMBER" | "ADMIN";
};

type UpdateData = {
  isActive?: boolean;
  role?: "MEMBER" | "ADMIN";
  token?: string;
};

/** Acesso a dados do convite por link de workspace. */
export const WorkspaceInviteRepository = {
  async findByWorkspaceId(
    workspaceId: string,
  ): Promise<Result<WorkspaceInvite | null>> {
    try {
      const invite = await prisma.workspaceInvite.findUnique({
        where: { workspaceId },
      });
      return ok(invite);
    } catch {
      return err(databaseError());
    }
  },

  async findByToken(
    token: string,
  ): Promise<Result<WorkspaceInviteWithWorkspace | null>> {
    try {
      const invite = await prisma.workspaceInvite.findUnique({
        where: { token },
        include: { workspace: true },
      });
      return ok(invite);
    } catch {
      return err(databaseError());
    }
  },

  async create(data: CreateData): Promise<Result<WorkspaceInvite>> {
    try {
      const invite = await prisma.workspaceInvite.create({ data });
      return ok(invite);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    workspaceId: string,
    data: UpdateData,
  ): Promise<Result<WorkspaceInvite>> {
    try {
      const invite = await prisma.workspaceInvite.update({
        where: { workspaceId },
        data,
      });
      return ok(invite);
    } catch {
      return err(databaseError());
    }
  },
};
