import { randomUUID } from "node:crypto";
import type { Company, Prisma } from "@prisma/client";

type CompanyOverrides = Partial<
  Omit<Prisma.CompanyCreateInput, "workspace" | "createdBy">
>;

/** Cria uma empresa real no banco de testes, escopada a uma workspace + criador. */
export async function createCompany(
  workspaceId: string,
  createdById: string,
  overrides: CompanyOverrides = {},
): Promise<Company> {
  const { prisma } = await import("@/src/lib/prisma");
  const suffix = randomUUID().slice(0, 8);
  return prisma.company.create({
    data: {
      name: overrides.name ?? "Acme Inc",
      domain: overrides.domain ?? `acme-${suffix}.com`,
      ...overrides,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
