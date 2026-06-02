import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateAiUsageData = {
  workspaceId: string;
  conversationId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type AiUsageSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  currentMonthInputTokens: number;
  currentMonthOutputTokens: number;
  usageByDay: {
    date: string;
    inputTokens: number;
    outputTokens: number;
  }[];
};

export const AiUsageRepository = {
  async create(data: CreateAiUsageData): Promise<Result<void>> {
    try {
      await prisma.aiUsage.create({ data });
      return ok(undefined);
    } catch {
      return err(databaseError());
    }
  },

  async getSummary(workspaceId: string): Promise<Result<AiUsageSummary>> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totals, monthTotals, daily] = await Promise.all([
        prisma.aiUsage.aggregate({
          where: { workspaceId },
          _sum: { inputTokens: true, outputTokens: true },
        }),
        prisma.aiUsage.aggregate({
          where: { workspaceId, createdAt: { gte: monthStart } },
          _sum: { inputTokens: true, outputTokens: true },
        }),
        prisma.aiUsage.groupBy({
          by: ["createdAt"],
          where: {
            workspaceId,
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) },
          },
          _sum: { inputTokens: true, outputTokens: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      // Agrega por dia (os registros vêm com timestamp completo)
      const dayMap = new Map<
        string,
        { inputTokens: number; outputTokens: number }
      >();
      for (const row of daily) {
        const date = (row.createdAt as Date).toISOString().slice(0, 10);
        const cur = dayMap.get(date) ?? { inputTokens: 0, outputTokens: 0 };
        cur.inputTokens += row._sum.inputTokens ?? 0;
        cur.outputTokens += row._sum.outputTokens ?? 0;
        dayMap.set(date, cur);
      }

      return ok({
        totalInputTokens: totals._sum.inputTokens ?? 0,
        totalOutputTokens: totals._sum.outputTokens ?? 0,
        currentMonthInputTokens: monthTotals._sum.inputTokens ?? 0,
        currentMonthOutputTokens: monthTotals._sum.outputTokens ?? 0,
        usageByDay: [...dayMap.entries()].map(([date, v]) => ({
          date,
          ...v,
        })),
      });
    } catch {
      return err(databaseError());
    }
  },
};
