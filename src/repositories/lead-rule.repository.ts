import type {
  LeadRoutingRule,
  LeadRuleField,
  LeadRuleOperator,
  LeadScoringRule,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

type Condition = {
  field: LeadRuleField;
  operator: LeadRuleOperator;
  value: string | null;
};

/** Acesso a dados das regras de scoring e roteamento de leads. */
export const LeadScoringRuleRepository = {
  async listActive(workspaceId: string): Promise<Result<LeadScoringRule[]>> {
    try {
      const rules = await prisma.leadScoringRule.findMany({
        where: { workspaceId, active: true },
        orderBy: { position: "asc" },
      });
      return ok(rules);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<LeadScoringRule[]>> {
    try {
      const rules = await prisma.leadScoringRule.findMany({
        where: { workspaceId },
        orderBy: { position: "asc" },
      });
      return ok(rules);
    } catch {
      return err(databaseError());
    }
  },

  async create(
    workspaceId: string,
    data: Condition & { points: number; active: boolean },
  ): Promise<Result<LeadScoringRule>> {
    try {
      const last = await prisma.leadScoringRule.findFirst({
        where: { workspaceId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const rule = await prisma.leadScoringRule.create({
        data: { ...data, workspaceId, position: (last?.position ?? 0) + 1 },
      });
      return ok(rule);
    } catch {
      return err(databaseError());
    }
  },

  async delete(id: string, workspaceId: string): Promise<Result<true>> {
    try {
      await prisma.leadScoringRule.deleteMany({ where: { id, workspaceId } });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },
};

export const LeadRoutingRuleRepository = {
  async listActive(workspaceId: string): Promise<Result<LeadRoutingRule[]>> {
    try {
      const rules = await prisma.leadRoutingRule.findMany({
        where: { workspaceId, active: true },
        orderBy: { position: "asc" },
      });
      return ok(rules);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<LeadRoutingRule[]>> {
    try {
      const rules = await prisma.leadRoutingRule.findMany({
        where: { workspaceId },
        orderBy: { position: "asc" },
      });
      return ok(rules);
    } catch {
      return err(databaseError());
    }
  },

  async create(
    workspaceId: string,
    data: Condition & { ownerId: string; active: boolean },
  ): Promise<Result<LeadRoutingRule>> {
    try {
      const last = await prisma.leadRoutingRule.findFirst({
        where: { workspaceId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const rule = await prisma.leadRoutingRule.create({
        data: { ...data, workspaceId, position: (last?.position ?? 0) + 1 },
      });
      return ok(rule);
    } catch {
      return err(databaseError());
    }
  },

  async delete(id: string, workspaceId: string): Promise<Result<true>> {
    try {
      await prisma.leadRoutingRule.deleteMany({ where: { id, workspaceId } });
      return ok(true);
    } catch {
      return err(databaseError());
    }
  },
};
