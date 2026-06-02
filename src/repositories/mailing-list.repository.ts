import type { MailingList, MailingListMember } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type MailingListWithMembers = MailingList & {
  members: MailingListMember[];
};

export type MailingListWithCount = MailingList & {
  _count: { members: number };
};

export const MailingListRepository = {
  async create(data: {
    workspaceId: string;
    createdById: string;
    name: string;
    description?: string;
  }): Promise<Result<MailingList>> {
    try {
      const list = await prisma.mailingList.create({ data });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async findById(
    id: string,
  ): Promise<Result<MailingListWithMembers | null>> {
    try {
      const list = await prisma.mailingList.findUnique({
        where: { id, deletedAt: null },
        include: { members: { orderBy: { createdAt: "asc" } } },
      });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<MailingListWithCount[]>> {
    try {
      const lists = await prisma.mailingList.findMany({
        where: { workspaceId, deletedAt: null },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
      });
      return ok(lists);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Result<MailingList>> {
    try {
      const list = await prisma.mailingList.update({ where: { id }, data });
      return ok(list);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string): Promise<Result<void>> {
    try {
      await prisma.mailingList.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return ok(undefined);
    } catch {
      return err(databaseError());
    }
  },

  async addMembers(
    mailingListId: string,
    members: { email: string; name?: string; personId?: string }[],
  ): Promise<Result<void>> {
    try {
      await prisma.mailingListMember.createMany({
        data: members.map((m) => ({
          mailingListId,
          email: m.email.trim().toLowerCase(),
          name: m.name?.trim() || null,
          personId: m.personId || null,
        })),
        skipDuplicates: true,
      });
      return ok(undefined);
    } catch {
      return err(databaseError());
    }
  },

  async removeMember(memberId: string): Promise<Result<void>> {
    try {
      await prisma.mailingListMember.delete({ where: { id: memberId } });
      return ok(undefined);
    } catch {
      return err(databaseError());
    }
  },

  async getMembersByListIds(
    mailingListIds: string[],
  ): Promise<Result<MailingListMember[]>> {
    try {
      const members = await prisma.mailingListMember.findMany({
        where: { mailingListId: { in: mailingListIds } },
      });
      return ok(members);
    } catch {
      return err(databaseError());
    }
  },
};
