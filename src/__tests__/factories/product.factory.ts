import type { BillingType, Product } from "@prisma/client";

type ProductOverrides = {
  name?: string;
  sku?: string | null;
  unitPrice?: number;
  billingType?: BillingType;
  active?: boolean;
};

/** Cria um produto real no banco de testes, escopado a workspace + criador. */
export async function createProduct(
  workspaceId: string,
  createdById: string,
  overrides: ProductOverrides = {},
): Promise<Product> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.product.create({
    data: {
      name: overrides.name ?? "Plano Pro",
      sku: overrides.sku ?? null,
      unitPrice: overrides.unitPrice ?? 100,
      billingType: overrides.billingType ?? "ONE_TIME",
      active: overrides.active ?? true,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
