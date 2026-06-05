import type { Product } from "@prisma/client";
import type { ProductDTO } from "@/src/schemas/product.schema";

/** `Prisma.Product` → `ProductDTO` (Decimal → number, datas em ISO). */
export function toProductDTO(product: Product): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    unitPrice: product.unitPrice.toNumber(),
    currency: product.currency,
    billingType: product.billingType,
    active: product.active,
    position: product.position,
    workspaceId: product.workspaceId,
    createdById: product.createdById,
    updatedById: product.updatedById,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt:
      product.deletedAt === null ? null : product.deletedAt.toISOString(),
  };
}
