import type { OpportunityLineItem } from "@prisma/client";
import type { LineItemDTO } from "@/src/schemas/opportunity-line-item.schema";

/** `Prisma.OpportunityLineItem` → `LineItemDTO` (Decimals → number, datas ISO). */
export function toLineItemDTO(item: OpportunityLineItem): LineItemDTO {
  return {
    id: item.id,
    opportunityId: item.opportunityId,
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toNumber(),
    discountPct: item.discountPct.toNumber(),
    billingType: item.billingType,
    total: item.total.toNumber(),
    position: item.position,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
