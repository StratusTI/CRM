import type { HookVaultItem } from "@prisma/client";
import type { HookVaultItemDTO } from "@/src/schemas/hook-vault.schema";

/** `Prisma.HookVaultItem` → `HookVaultItemDTO` (datas em ISO). */
export function toHookVaultItemDTO(item: HookVaultItem): HookVaultItemDTO {
  return {
    id: item.id,
    text: item.text,
    platform: item.platform,
    usageCount: item.usageCount,
    notes: item.notes,
    workspaceId: item.workspaceId,
    createdById: item.createdById,
    updatedById: item.updatedById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    deletedAt: item.deletedAt === null ? null : item.deletedAt.toISOString(),
  };
}
