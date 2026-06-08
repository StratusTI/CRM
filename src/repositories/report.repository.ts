import { Prisma, type Report } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateReportData = {
  workspaceId: string;
  createdById: string;
  name: string;
  source: string;
  columns: Prisma.InputJsonValue;
  filters: Prisma.InputJsonValue;
  groupBy: string | null;
  sort: Prisma.InputJsonValue | null;
  query: Prisma.InputJsonValue | null;
};

export type UpdateReportData = {
  updatedById: string;
  name?: string;
  columns?: Prisma.InputJsonValue;
  filters?: Prisma.InputJsonValue;
  groupBy?: string | null;
  sort?: Prisma.InputJsonValue | null;
  query?: Prisma.InputJsonValue | null;
};

/** Acesso a dados de relatório. Sem regra de negócio — só Prisma. */
export const ReportRepository = {
  async create(data: CreateReportData): Promise<Result<Report>> {
    try {
      const { workspaceId, createdById, sort, query, ...fields } = data;
      const report = await prisma.report.create({
        data: {
          ...fields,
          workspaceId,
          createdById,
          sort: sort ?? Prisma.JsonNull,
          query: query ?? Prisma.JsonNull,
        },
      });
      return ok(report);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Report | null>> {
    try {
      const report = await prisma.report.findUnique({ where: { id } });
      return ok(report);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<Report[]>> {
    try {
      const reports = await prisma.report.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(reports);
    } catch {
      return err(databaseError());
    }
  },

  async update(id: string, data: UpdateReportData): Promise<Result<Report>> {
    try {
      const { sort, query, ...rest } = data;
      const report = await prisma.report.update({
        where: { id },
        data: {
          ...rest,
          ...("sort" in data ? { sort: sort ?? Prisma.JsonNull } : {}),
          ...("query" in data ? { query: query ?? Prisma.JsonNull } : {}),
        },
      });
      return ok(report);
    } catch {
      return err(databaseError());
    }
  },

  async softDelete(id: string, updatedById: string): Promise<Result<Report>> {
    try {
      const report = await prisma.report.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(report);
    } catch {
      return err(databaseError());
    }
  },
};
