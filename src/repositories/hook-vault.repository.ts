import type { HookVaultItem, SocialPlatform } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateHookVaultItemData = {
  workspaceId: string;
  createdById: string;
  text: string;
  platform: SocialPlatform | null;
  usageCount: number;
  notes: string | null;
};

export type UpdateHookVaultItemData = {
  updatedById: string;
  text?: string;
  platform?: SocialPlatform | null;
  usageCount?: number;
  notes?: string | null;
};

/** Acesso a dados de hook vault. Sem regra de negócio — só Prisma. */
export const HookVaultRepository = {
  async create(data: CreateHookVaultItemData): Promise<Result<HookVaultItem>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const item = await prisma.hookVaultItem.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<HookVaultItem | null>> {
    try {
      const item = await prisma.hookVaultItem.findUnique({ where: { id } });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<HookVaultItem[]>> {
    try {
      const items = await prisma.hookVaultItem.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(items);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.hookVaultItem.updateMany({
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
    data: UpdateHookVaultItemData,
  ): Promise<Result<HookVaultItem>> {
    try {
      const item = await prisma.hookVaultItem.update({ where: { id }, data });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(
    id: string,
    updatedById: string,
  ): Promise<Result<HookVaultItem>> {
    try {
      const item = await prisma.hookVaultItem.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },
};
