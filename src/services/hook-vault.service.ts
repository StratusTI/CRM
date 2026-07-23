import type { HookVaultItem } from "@prisma/client";
import { hookVaultItemNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toHookVaultItemDTO } from "@/src/mappers/hook-vault.mapper";
import { HookVaultRepository } from "@/src/repositories/hook-vault.repository";
import type {
  CreateHookVaultItemInput,
  HookVaultItemDTO,
  UpdateHookVaultItemInput,
} from "@/src/schemas/hook-vault.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<HookVaultItem>> {
  const found = await HookVaultRepository.findById(id);
  if (!found.ok) return found;
  const item = found.value;
  if (!item || item.workspaceId !== workspaceId || item.deletedAt) {
    return err(hookVaultItemNotFound());
  }
  return ok(item);
}

export const HookVaultService = {
  async create(
    userId: string,
    slug: string,
    input: CreateHookVaultItemInput,
  ): Promise<Result<HookVaultItemDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const created = await HookVaultRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      text: input.text,
      platform: input.platform ?? null,
      usageCount: input.usageCount ?? 0,
      notes: input.notes ?? null,
    });
    if (!created.ok) return created;
    return ok(toHookVaultItemDTO(created.value));
  },

  async list(
    userId: string,
    slug: string,
  ): Promise<Result<HookVaultItemDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const result = await HookVaultRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toHookVaultItemDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<HookVaultItemDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "VIEW",
    });
    if (!ws.ok) return ws;

    const item = await loadInWorkspace(ws.value, id);
    if (!item.ok) return item;
    return ok(toHookVaultItemDTO(item.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateHookVaultItemInput,
  ): Promise<Result<HookVaultItemDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const updated = await HookVaultRepository.update(id, {
      updatedById: userId,
      ...input,
    });
    if (!updated.ok) return updated;
    return ok(toHookVaultItemDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<HookVaultItemDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const removed = await HookVaultRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toHookVaultItemDTO(removed.value));
  },

  /** Persiste a ordem manual dos hooks (drag-drop). */
  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "social",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return HookVaultRepository.reorder(ws.value, ids);
  },
};
