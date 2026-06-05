import type { Opportunity, OpportunityLineItem } from "@prisma/client";
import {
  badRequest,
  lineItemNotFound,
  opportunityNotFound,
  productNotFound,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toOpportunityDTO } from "@/src/mappers/opportunity.mapper";
import { toLineItemDTO } from "@/src/mappers/opportunity-line-item.mapper";
import { OpportunityRepository } from "@/src/repositories/opportunity.repository";
import { OpportunityLineItemRepository } from "@/src/repositories/opportunity-line-item.repository";
import { ProductRepository } from "@/src/repositories/product.repository";
import type {
  CreateLineItemInput,
  LineItemDTO,
  UpdateLineItemInput,
} from "@/src/schemas/opportunity-line-item.schema";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

/** total = quantidade × preço × (1 − desconto%), arredondado a 2 casas. */
function computeTotal(
  quantity: number,
  unitPrice: number,
  discountPct: number,
): number {
  const raw = quantity * unitPrice * (1 - discountPct / 100);
  return Math.round(raw * 100) / 100;
}

async function loadOpportunity(
  workspaceId: string,
  opportunityId: string,
): Promise<Result<Opportunity>> {
  const found = await OpportunityRepository.findById(opportunityId);
  if (!found.ok) return found;
  const opportunity = found.value;
  if (
    !opportunity ||
    opportunity.workspaceId !== workspaceId ||
    opportunity.deletedAt
  ) {
    return err(opportunityNotFound());
  }
  return ok(opportunity);
}

async function loadItem(
  opportunityId: string,
  itemId: string,
): Promise<Result<OpportunityLineItem>> {
  const found = await OpportunityLineItemRepository.findById(itemId);
  if (!found.ok) return found;
  const item = found.value;
  if (!item || item.opportunityId !== opportunityId) {
    return err(lineItemNotFound());
  }
  return ok(item);
}

/**
 * Recalcula `Opportunity.amount` = soma dos totais dos itens (ou `null` quando
 * não há itens) e dispara o evento `opportunity.updated` para as automações.
 */
async function recomputeAmount(
  workspaceId: string,
  userId: string,
  opportunityId: string,
): Promise<Result<true>> {
  const agg = await OpportunityLineItemRepository.aggregate(opportunityId);
  if (!agg.ok) return agg;
  const amount = agg.value.count > 0 ? agg.value.sum : null;

  const updated = await OpportunityRepository.update(opportunityId, {
    updatedById: userId,
    amount,
  });
  if (!updated.ok) return updated;

  await dispatchRecordEvent({
    workspaceId,
    actingUserId: userId,
    entity: "opportunity",
    event: "updated",
    record: toOpportunityDTO(updated.value),
    changedFields: ["amount"],
  });
  return ok(true);
}

export const OpportunityLineItemService = {
  async list(
    userId: string,
    slug: string,
    opportunityId: string,
  ): Promise<Result<LineItemDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const opp = await loadOpportunity(ws.value, opportunityId);
    if (!opp.ok) return opp;

    const items =
      await OpportunityLineItemRepository.listByOpportunity(opportunityId);
    if (!items.ok) return items;
    return ok(items.value.map(toLineItemDTO));
  },

  async create(
    userId: string,
    slug: string,
    opportunityId: string,
    input: CreateLineItemInput,
  ): Promise<Result<LineItemDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "CREATE",
    });
    if (!ws.ok) return ws;
    const opp = await loadOpportunity(ws.value, opportunityId);
    if (!opp.ok) return opp;

    // Snapshot do produto (se informado), permitindo sobrescrever no payload.
    let name = input.name;
    let unitPrice = input.unitPrice;
    let billingType = input.billingType;
    let productId: string | null = null;

    if (input.productId) {
      const found = await ProductRepository.findById(input.productId);
      if (!found.ok) return found;
      const product = found.value;
      if (!product || product.workspaceId !== ws.value || product.deletedAt) {
        return err(productNotFound());
      }
      productId = product.id;
      name = name ?? product.name;
      unitPrice = unitPrice ?? product.unitPrice.toNumber();
      billingType = billingType ?? product.billingType;
    }

    if (!name) return err(badRequest("Informe o produto ou o nome do item"));

    const quantity = input.quantity;
    const finalUnitPrice = unitPrice ?? 0;
    const discountPct = input.discountPct;
    const total = computeTotal(quantity, finalUnitPrice, discountPct);

    const created = await OpportunityLineItemRepository.create({
      opportunityId,
      productId,
      name,
      quantity,
      unitPrice: finalUnitPrice,
      discountPct,
      billingType: billingType ?? "ONE_TIME",
      total,
    });
    if (!created.ok) return created;

    const recomputed = await recomputeAmount(ws.value, userId, opportunityId);
    if (!recomputed.ok) return recomputed;

    return ok(toLineItemDTO(created.value));
  },

  async update(
    userId: string,
    slug: string,
    opportunityId: string,
    itemId: string,
    input: UpdateLineItemInput,
  ): Promise<Result<LineItemDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    const opp = await loadOpportunity(ws.value, opportunityId);
    if (!opp.ok) return opp;
    const existing = await loadItem(opportunityId, itemId);
    if (!existing.ok) return existing;

    const quantity = input.quantity ?? existing.value.quantity;
    const unitPrice = input.unitPrice ?? existing.value.unitPrice.toNumber();
    const discountPct =
      input.discountPct ?? existing.value.discountPct.toNumber();

    const updated = await OpportunityLineItemRepository.update(itemId, {
      ...input,
      total: computeTotal(quantity, unitPrice, discountPct),
    });
    if (!updated.ok) return updated;

    const recomputed = await recomputeAmount(ws.value, userId, opportunityId);
    if (!recomputed.ok) return recomputed;

    return ok(toLineItemDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    opportunityId: string,
    itemId: string,
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "opportunities",
      action: "DELETE",
    });
    if (!ws.ok) return ws;
    const opp = await loadOpportunity(ws.value, opportunityId);
    if (!opp.ok) return opp;
    const existing = await loadItem(opportunityId, itemId);
    if (!existing.ok) return existing;

    const removed = await OpportunityLineItemRepository.delete(itemId);
    if (!removed.ok) return removed;

    return recomputeAmount(ws.value, userId, opportunityId);
  },
};
