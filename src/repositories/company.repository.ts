import type { Company } from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateCompanyData = {
  workspaceId: string;
  createdById: string;
  name: string;
  domain: string | null;
  employees: number | null;
  linkedin: string | null;
  address: string | null;
  arr: number | null;
  icp: boolean;
  accountOwnerId: string | null;
};

export type UpdateCompanyData = {
  updatedById: string;
  name?: string;
  domain?: string | null;
  employees?: number | null;
  linkedin?: string | null;
  address?: string | null;
  arr?: number | null;
  icp?: boolean;
  accountOwnerId?: string | null;
};

/** Acesso a dados de empresa. Sem regra de negócio — só Prisma. */
export const CompanyRepository = {
  async create(data: CreateCompanyData): Promise<Result<Company>> {
    try {
      const company = await prisma.company.create({
        data: {
          name: data.name,
          domain: data.domain,
          employees: data.employees,
          linkedin: data.linkedin,
          address: data.address,
          arr: data.arr,
          icp: data.icp,
          workspaceId: data.workspaceId,
          createdById: data.createdById,
          accountOwnerId: data.accountOwnerId,
        },
      });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },

  async findById(id: string): Promise<Result<Company | null>> {
    try {
      const company = await prisma.company.findUnique({ where: { id } });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },

  /** Existe empresa não-deletada com este id na workspace? (validação de referência). */
  async existsInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.company.count({
        where: { id, workspaceId, deletedAt: null },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  /** Empresas não-deletadas da workspace, na ordem manual (position) então recência. */
  async listByWorkspace(workspaceId: string): Promise<Result<Company[]>> {
    try {
      const companies = await prisma.company.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });
      return ok(companies);
    } catch {
      return err(databaseError());
    }
  },

  /** Persiste a ordem manual: `position` = índice (escopado à workspace). */
  async reorder(workspaceId: string, ids: string[]): Promise<Result<true>> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.company.updateMany({
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

  /** Existe empresa não-deletada com este domínio na workspace? (`excludeId` ignora a própria). */
  async existsByDomain(
    workspaceId: string,
    domain: string,
    excludeId?: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.company.count({
        where: {
          workspaceId,
          domain,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
      return ok(count > 0);
    } catch {
      return err(databaseError());
    }
  },

  async update(id: string, data: UpdateCompanyData): Promise<Result<Company>> {
    try {
      const { updatedById, ...fields } = data;
      const company = await prisma.company.update({
        where: { id },
        data: { ...fields, updatedById },
      });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },

  /** Soft delete: marca `deletedAt` e registra quem removeu. */
  async softDelete(id: string, updatedById: string): Promise<Result<Company>> {
    try {
      const company = await prisma.company.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById },
      });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },
};
