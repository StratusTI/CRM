import type { Quota } from "@prisma/client";
import type { QuotaDTO } from "@/src/schemas/quota.schema";

/** `Prisma.Quota` → `QuotaDTO` (Decimal → number, datas em ISO). */
export function toQuotaDTO(quota: Quota): QuotaDTO {
  return {
    id: quota.id,
    ownerId: quota.ownerId,
    period: quota.period,
    periodKey: quota.periodKey,
    targetAmount: quota.targetAmount.toNumber(),
    workspaceId: quota.workspaceId,
    createdById: quota.createdById,
    updatedById: quota.updatedById,
    createdAt: quota.createdAt.toISOString(),
    updatedAt: quota.updatedAt.toISOString(),
  };
}
