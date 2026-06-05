import type { Lead, LeadRoutingRule, LeadScoringRule } from "@prisma/client";
import type {
  LeadDTO,
  RoutingRuleDTO,
  ScoringRuleDTO,
} from "@/src/schemas/lead.schema";

/** `Prisma.Lead` → `LeadDTO` (datas em ISO). */
export function toLeadDTO(lead: Lead): LeadDTO {
  return {
    id: lead.id,
    name: lead.name,
    emails: lead.emails,
    phones: lead.phones,
    company: lead.company,
    jobTitle: lead.jobTitle,
    city: lead.city,
    linkedin: lead.linkedin,
    source: lead.source,
    status: lead.status,
    score: lead.score,
    ownerId: lead.ownerId,
    convertedPersonId: lead.convertedPersonId,
    convertedOpportunityId: lead.convertedOpportunityId,
    workspaceId: lead.workspaceId,
    createdById: lead.createdById,
    updatedById: lead.updatedById,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    deletedAt: lead.deletedAt === null ? null : lead.deletedAt.toISOString(),
  };
}

export function toScoringRuleDTO(rule: LeadScoringRule): ScoringRuleDTO {
  return {
    id: rule.id,
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
    points: rule.points,
    active: rule.active,
    position: rule.position,
    workspaceId: rule.workspaceId,
  };
}

export function toRoutingRuleDTO(rule: LeadRoutingRule): RoutingRuleDTO {
  return {
    id: rule.id,
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
    ownerId: rule.ownerId,
    active: rule.active,
    position: rule.position,
    workspaceId: rule.workspaceId,
  };
}
