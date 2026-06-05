import type { Company } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  companyCnpjTaken,
  companyDomainTaken,
  databaseError,
} from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";
import type { CompanyAddress } from "@/src/schemas/company.schema";

export type CreateCompanyData = {
  workspaceId: string;
  createdById: string;
  name: string;
  cnpj: string | null;
  domain: string | null;
  employees: number | null;
  linkedin: string | null;
  address: CompanyAddress | null;
  arr: number | null;
  icp: boolean;
  accountOwnerId: string | null;
};

export type UpdateCompanyData = {
  updatedById: string;
  name?: string;
  cnpj?: string | null;
  domain?: string | null;
  employees?: number | null;
  linkedin?: string | null;
  address?: CompanyAddress | null;
  arr?: number | null;
  icp?: boolean;
  accountOwnerId?: string | null;
};

/**
 * Traduz o endereço para o input de coluna JSON do Prisma: `undefined` mantém
 * o valor atual (omitido), `null` grava NULL no banco (`Prisma.DbNull`).
 */
function toAddressInput(
  address: CompanyAddress | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (address === undefined) return undefined;
  if (address === null) return Prisma.DbNull;
  return address as Prisma.InputJsonValue;
}

/**
 * Traduz erros de escrita do Prisma. Uma violação de unicidade (P2002) vira o
 * conflito de domínio correspondente (CNPJ/domínio) — assim a API responde 409
 * em vez de 500 caso uma empresa ativa já use o mesmo valor. Demais erros caem
 * em `databaseError`.
 */
function mapWriteError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    // O formato de `meta` varia: o driver adapter (PrismaPg) deixa `target`
    // vazio e expõe o campo/constraint em `driverAdapterError.cause`. Reunimos
    // todos os sinais disponíveis e procuramos o nome do campo.
    const meta = (error.meta ?? {}) as {
      target?: unknown;
      driverAdapterError?: {
        cause?: {
          originalMessage?: string;
          constraint?: { fields?: string[] };
        };
      };
    };
    const cause = meta.driverAdapterError?.cause;
    const haystack = [
      Array.isArray(meta.target) ? meta.target.join(",") : String(meta.target),
      cause?.originalMessage ?? "",
      cause?.constraint?.fields?.join(",") ?? "",
    ].join(" ");
    if (haystack.includes("cnpj")) return companyCnpjTaken();
    if (haystack.includes("domain")) return companyDomainTaken();
  }
  return databaseError();
}

/** Acesso a dados de empresa. Sem regra de negócio — só Prisma. */
export const CompanyRepository = {
  async create(data: CreateCompanyData): Promise<Result<Company>> {
    try {
      const company = await prisma.company.create({
        data: {
          name: data.name,
          cnpj: data.cnpj,
          domain: data.domain,
          employees: data.employees,
          linkedin: data.linkedin,
          address: toAddressInput(data.address),
          arr: data.arr,
          icp: data.icp,
          workspaceId: data.workspaceId,
          createdById: data.createdById,
          accountOwnerId: data.accountOwnerId,
        },
      });
      return ok(company);
    } catch (error) {
      return err(mapWriteError(error));
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

  /** Empresa não-deletada com este domínio na workspace (ou `null`). */
  async findByDomain(
    workspaceId: string,
    domain: string,
  ): Promise<Result<Company | null>> {
    try {
      const company = await prisma.company.findFirst({
        where: { workspaceId, domain, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },

  /** Empresa não-deletada com este CNPJ na workspace (ou `null`). */
  async findByCnpj(
    workspaceId: string,
    cnpj: string,
  ): Promise<Result<Company | null>> {
    try {
      const company = await prisma.company.findFirst({
        where: { workspaceId, cnpj, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },

  /** Existe empresa não-deletada com este CNPJ na workspace? (`excludeId` ignora a própria). */
  async existsByCnpj(
    workspaceId: string,
    cnpj: string,
    excludeId?: string,
  ): Promise<Result<boolean>> {
    try {
      const count = await prisma.company.count({
        where: {
          workspaceId,
          cnpj,
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
      const { updatedById, address, ...fields } = data;
      const company = await prisma.company.update({
        where: { id },
        data: {
          ...fields,
          ...("address" in data ? { address: toAddressInput(address) } : {}),
          updatedById,
        },
      });
      return ok(company);
    } catch (error) {
      return err(mapWriteError(error));
    }
  },

  /**
   * Soft delete: marca `deletedAt` e registra quem removeu. Também libera os
   * campos com unicidade no banco (`cnpj`/`domain`) — o índice único conta
   * linhas soft-deleted, então mantê-los reservaria o valor e impediria
   * recadastrar a mesma empresa depois (P2002).
   */
  async softDelete(id: string, updatedById: string): Promise<Result<Company>> {
    try {
      const company = await prisma.company.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById, cnpj: null, domain: null },
      });
      return ok(company);
    } catch {
      return err(databaseError());
    }
  },
};
