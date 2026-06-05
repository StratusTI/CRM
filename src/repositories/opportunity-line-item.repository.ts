import type { BillingType, OpportunityLineItem } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateLineItemData = {
  opportunityId: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  billingType: BillingType;
  total: number;
};

export type UpdateLineItemData = {
  name?: string;
  quantity?: number;
  unitPrice?: number;
  discountPct?: number;
  billingType?: BillingType;
  total?: number;
};

/** Acesso a dados dos itens de oportunidade. Sem regra de negócio — só Prisma. */
export const OpportunityLineItemRepository = {
  async listByOpportunity(
    opportunityId: string,
  ): Promise<Result<OpportunityLineItem[]>> {
    try {
      const items = await prisma.opportunityLineItem.findMany({
        where: { opportunityId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      return ok(items);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<OpportunityLineItem | null>> {
    try {
      const item = await prisma.opportunityLineItem.findUnique({
        where: { id },
      });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },

  async create(data: CreateLineItemData): Promise<Result<OpportunityLineItem>> {
    try {
      const last = await prisma.opportunityLineItem.findFirst({
        where: { opportunityId: data.opportunityId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const item = await prisma.opportunityLineItem.create({
        data: { ...data, position: (last?.position ?? 0) + 1 },
      });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },

  async update(
    id: string,
    data: UpdateLineItemData,
  ): Promise<Result<OpportunityLineItem>> {
    try {
      const item = await prisma.opportunityLineItem.update({
        where: { id },
        data,
      });
      return ok(item);
    } catch {
      return err(databaseError());
    }
  },

  async delete(id: string): Promise<Result<true>> {
    try {
      await prisma.opportunityLineItem.delete({ where: { id } });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },

  /** Soma dos totais e quantidade de itens da oportunidade (para derivar amount). */
  async aggregate(
    opportunityId: string,
  ): Promise<Result<{ count: number; sum: number }>> {
    try {
      const result = await prisma.opportunityLineItem.aggregate({
        where: { opportunityId },
        _sum: { total: true },
        _count: true,
      });
      return ok({
        count: result._count,
        sum: result._sum.total?.toNumber() ?? 0,
      });
    } catch {
      return err(databaseError());
    }
  },
};
