import type { Lead, LeadStatus } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateLeadData = {
  workspaceId: string;
  createdById: string;
  name: string;
  emails: string[];
  phones: string[];
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  linkedin: string | null;
  source: string | null;
  status: LeadStatus;
  score: number;
  ownerId: string | null;
};

export type UpdateLeadData = {
  updatedById: string;
  name?: string;
  emails?: string[];
  phones?: string[];
  company?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  linkedin?: string | null;
  source?: string | null;
  status?: LeadStatus;
  score?: number;
  ownerId?: string | null;
  convertedPersonId?: string | null;
  convertedOpportunityId?: string | null;
};

/** Status que ainda contam como "lead ativo" para o round-robin. */
const ACTIVE_STATUSES: LeadStatus[] = ["NEW", "WORKING", "QUALIFIED"];

/** Acesso a dados de lead. Sem regra de negócio — só Prisma. */
export const LeadRepository = {
  async create(data: CreateLeadData): Promise<Result<Lead>> {
    try {
      const { workspaceId, createdById, ...fields } = data;
      const lead = await prisma.lead.create({
        data: { ...fields, workspaceId, createdById },
      });
      return ok(lead);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Lead | null>> {
    try {
      const lead = await prisma.lead.findUnique({ where: { id } });
      return ok(lead);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Lead[]>> {
    try {
      const leads = await prisma.lead.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(leads);
    } catch {
      return err(databaseError());
    }
  },

  async update(id: string, data: UpdateLeadData): Promise<Result<Lead>> {
    try {
      const lead = await prisma.lead.update({ where: { id }, data });
      return ok(lead);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Lead>> {
    try {
      const lead = await prisma.lead.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(lead);
    } catch {
      return err(databaseError());
    }
  },

  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.lead.updateMany({
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

  /** Quantos leads ativos cada responsável tem (para o round-robin). */
  async countActiveByOwner(
    workspaceId: string,
  ): Promise<Result<Map<string, number>>> {
    try {
      const rows = await prisma.lead.groupBy({
        by: ["ownerId"],
        where: {
          workspaceId,
          deletedAt: null,
          status: { in: ACTIVE_STATUSES },
          ownerId: { not: null },
        },
        _count: true,
      });
      const map = new Map<string, number>();
      for (const r of rows) {
        if (r.ownerId) map.set(r.ownerId, r._count);
      }
      return ok(map);
    } catch {
      return err(databaseError());
    }
  },
};
