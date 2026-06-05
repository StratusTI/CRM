import type { Prisma } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type MembershipWithWorkspace = Prisma.MembershipGetPayload<{
  include: { workspace: true; profile: true };
}>;

export type MembershipWithUser = Prisma.MembershipGetPayload<{
  include: { user: true; profile: true };
}>;

/** Acesso a dados de membership (relação usuário ⇄ workspace). */
export const MembershipRepository = {
  /** Membership do usuário numa workspace identificada pelo slug (com perfil). */
  async findByUserAndSlug(
    userId: string,
    slug: string,
  ): Promise<Result<MembershipWithWorkspace | null>> {
    try {
      const membership = await prisma.membership.findFirst({
        where: { userId, workspace: { slug } },
        include: { workspace: true, profile: true },
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
        include: { workspace: true, profile: true },
        orderBy: { createdAt: "asc" },
      });
      return ok(memberships);
    } catch {
      return err(databaseError());
    }
  },

  /** O usuário é membro da workspace? (validação de referência, ex.: owner de meta). */
  async existsInWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.membership.count({
        where: { userId, workspaceId },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /** Membership de um usuário numa workspace (por id), com perfil. */
  async findByUserAndWorkspaceId(
    userId: string,
    workspaceId: string,
  ): Promise<Result<MembershipWithUser | null>> {
    try {
      const membership = await prisma.membership.findFirst({
        where: { userId, workspaceId },
        include: { user: true, profile: true },
      });
      return ok(membership);
    } catch {
      return err(databaseError());
    }
  },

  /** Quantos proprietários (role OWNER) a workspace tem. */
  async countOwners(workspaceId: string): Promise<Result<number>> {
    try {
      const count = await prisma.membership.count({
        where: { workspaceId, role: "OWNER" },
      });
      return ok(count);
    } catch {
      return err(databaseError());
    }
  },

  /** Atualiza o perfil (e o papel derivado) de uma membership. */
  async setProfile(
    membershipId: string,
    profileId: string,
    role: "OWNER" | "ADMIN" | "MEMBER",
  ): Promise<Result<true>> {
    try {
      await prisma.membership.update({
        where: { id: membershipId },
        data: { profileId, role },
      });
      return ok(true);
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
        include: { user: true, profile: true },
        orderBy: { createdAt: "asc" },
      });
      return ok(memberships);
    } catch {
      return err(databaseError());
    }
  },
};
