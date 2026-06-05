import type { Quota } from "@prisma/client";
import { quotaNotFound, userNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toQuotaDTO } from "@/src/mappers/quota.mapper";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { QuotaRepository } from "@/src/repositories/quota.repository";
import type {
  CreateQuotaInput,
  QuotaDTO,
  UpdateQuotaInput,
} from "@/src/schemas/quota.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Quota>> {
  const found = await QuotaRepository.findById(id);
  if (!found.ok) return found;
  const quota = found.value;
  if (!quota || quota.workspaceId !== workspaceId) {
    return err(quotaNotFound());
  }
  return ok(quota);
}

export const QuotaService = {
  async list(userId: string, slug: string): Promise<Result<QuotaDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "quotas",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await QuotaRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toQuotaDTO));
  },

  /** Define a meta (cria ou atualiza pela chave única owner+período). */
  async upsert(
    userId: string,
    slug: string,
    input: CreateQuotaInput,
  ): Promise<Result<QuotaDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "quotas",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const isMember = await MembershipRepository.existsInWorkspace(
      input.ownerId,
      ws.value,
    );
    if (!isMember.ok) return isMember;
    if (!isMember.value) return err(userNotFound());

    const saved = await QuotaRepository.upsert({
      workspaceId: ws.value,
      createdById: userId,
      ownerId: input.ownerId,
      period: input.period,
      periodKey: input.periodKey,
      targetAmount: input.targetAmount,
    });
    if (!saved.ok) return saved;
    return ok(toQuotaDTO(saved.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateQuotaInput,
  ): Promise<Result<QuotaDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "quotas",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const updated = await QuotaRepository.update(
      id,
      userId,
      input.targetAmount,
    );
    if (!updated.ok) return updated;
    return ok(toQuotaDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "quotas",
      action: "DELETE",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    return QuotaRepository.delete(id);
  },
};
