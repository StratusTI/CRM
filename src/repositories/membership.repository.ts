import type { Prisma } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type MembershipWithWorkspace = Prisma.MembershipGetPayload<{
  include: { workspace: true };
}>;

export type MembershipWithUser = Prisma.MembershipGetPayload<{
  include: { user: true };
}>;

/** Acesso a dados de membership (relação usuário ⇄ workspace). */
export const MembershipRepository = {
  /** Membership do usuário numa workspace identificada pelo slug. */
  async findByUserAndSlug(
    userId: string,
    slug: string,
  ): Promise<Result<MembershipWithWorkspace | null>> {
    try {
      const membership = await prisma.membership.findFirst({
        where: { userId, workspace: { slug } },
        include: { workspace: true },
      });
      return ok(membership);
    } catch {
      return err(databaseError());
    }
  },

  /** Todas as memberships do usuário, da mais antiga para a mais recente. */
  async listByUser(userId: string): Promise<Result<MembershipWithWorkspace[]>> {
    try {
      const memberships = await prisma.membership.findMany({
        where: { userId },
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      });
      return ok(memberships);
    } catch {
      return err(databaseError());
    }
  },

  /** Membros (com usuário) de uma workspace, da mais antiga para a recente. */
  async listByWorkspaceId(
    workspaceId: string,
  ): Promise<Result<MembershipWithUser[]>> {
    try {
      const memberships = await prisma.membership.findMany({
        where: { workspaceId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      });
      return ok(memberships);
    } catch {
      return err(databaseError());
    }
  },
};
