import type { Company } from "@prisma/client";
import type { CompanyAddress, CompanyDTO } from "@/src/schemas/company.schema";

/** `Prisma.Company` → `CompanyDTO` (datas em ISO, `arr` Decimal → number). */
export function toCompanyDTO(company: Company): CompanyDTO {
  return {
    id: company.id,
    name: company.name,
    cnpj: company.cnpj,
    domain: company.domain,
    employees: company.employees,
    linkedin: company.linkedin,
    address: (company.address as CompanyAddress | null) ?? null,
    arr: company.arr === null ? null : company.arr.toNumber(),
    icp: company.icp,
    workspaceId: company.workspaceId,
    createdById: company.createdById,
    accountOwnerId: company.accountOwnerId,
    updatedById: company.updatedById,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    deletedAt:
      company.deletedAt === null ? null : company.deletedAt.toISOString(),
  };
}
