import type { Opportunity } from "@prisma/client";
import type { OpportunityDTO } from "@/src/schemas/opportunity.schema";

/** `Prisma.Opportunity` → `OpportunityDTO` (datas em ISO, `amount` Decimal → number). */
export function toOpportunityDTO(opportunity: Opportunity): OpportunityDTO {
  return {
    id: opportunity.id,
    name: opportunity.name,
    amount: opportunity.amount === null ? null : opportunity.amount.toNumber(),
    closeDate:
      opportunity.closeDate === null
        ? null
        : opportunity.closeDate.toISOString(),
    pipelineId: opportunity.pipelineId,
    stageId: opportunity.stageId,
    companyId: opportunity.companyId,
    pointOfContactId: opportunity.pointOfContactId,
    ownerId: opportunity.ownerId,
    source: opportunity.source,
    workspaceId: opportunity.workspaceId,
    createdById: opportunity.createdById,
    updatedById: opportunity.updatedById,
    createdAt: opportunity.createdAt.toISOString(),
    updatedAt: opportunity.updatedAt.toISOString(),
    deletedAt:
      opportunity.deletedAt === null
        ? null
        : opportunity.deletedAt.toISOString(),
  };
}
