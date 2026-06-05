import type { Quota, QuotaPeriod } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type UpsertQuotaData = {
  workspaceId: string;
  createdById: string;
  ownerId: string;
  period: QuotaPeriod;
  periodKey: string;
  targetAmount: number;
};

/** Acesso a dados de meta (quota). Sem regra de negócio — só Prisma. */
export const QuotaRepository = {
  async listByWorkspace(workspaceId: string): Promise<Result<Quota[]>> {
    try {
      const quotas = await prisma.quota.findMany({
        where: { workspaceId },
        orderBy: [{ periodKey: "asc" }, { ownerId: "asc" }],
      });
      return ok(quotas);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspaceAndPeriod(
    workspaceId: string,
    period: QuotaPeriod,
  ): Promise<Result<Quota[]>> {
    try {
      const quotas = await prisma.quota.findMany({
        where: { workspaceId, period },
        orderBy: [{ periodKey: "asc" }, { ownerId: "asc" }],
      });
      return ok(quotas);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Quota | null>> {
    try {
      const quota = await prisma.quota.findUnique({ where: { id } });
      return ok(quota);
    } catch {
      return err(databaseError());
    }
  },

  /**
   * Cria ou atualiza a meta da chave única (workspace+owner+period+periodKey).
   * Idempotente: definir a meta duas vezes apenas atualiza o valor.
   */
  async upsert(data: UpsertQuotaData): Promise<Result<Quota>> {
    try {
      const quota = await prisma.quota.upsert({
        where: {
          workspaceId_ownerId_period_periodKey: {
            workspaceId: data.workspaceId,
            ownerId: data.ownerId,
            period: data.period,
            periodKey: data.periodKey,
          },
        },
        create: {
          workspaceId: data.workspaceId,
          createdById: data.createdById,
          ownerId: data.ownerId,
          period: data.period,
          periodKey: data.periodKey,
          targetAmount: data.targetAmount,
        },
        update: {
          targetAmount: data.targetAmount,
          updatedById: data.createdById,
        },
      });
      return ok(quota);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    updatedById: string,
    targetAmount: number,
  ): Promise<Result<Quota>> {
    try {
      const quota = await prisma.quota.update({
        where: { id },
        data: { targetAmount, updatedById },
      });
      return ok(quota);
    } catch {
      return err(databaseError());
    }
  },

  async delete(id: string): Promise<Result<true>> {
    try {
      await prisma.quota.delete({ where: { id } });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },
};
