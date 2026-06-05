import type { Lead } from "@prisma/client";
import { matchesCondition } from "@/src/lib/lead-rules";
import { ok, type Result } from "@/src/lib/result";
import { LeadScoringRuleRepository } from "@/src/repositories/lead-rule.repository";

type LeadFields = Parameters<typeof matchesCondition>[0];

/**
 * Pontua um lead aplicando as regras de scoring ativas da workspace: para cada
 * regra cuja condição casa, soma `points`. Sem regras → score 0.
 */
export async function computeLeadScore(
  workspaceId: string,
  lead: LeadFields,
): Promise<Result<number>> {
  const rules = await LeadScoringRuleRepository.listActive(workspaceId);
  if (!rules.ok) return rules;

  let score = 0;
  for (const rule of rules.value) {
    if (matchesCondition(lead, rule.field, rule.operator, rule.value)) {
      score += rule.points;
    }
  }
  return ok(score);
}

/** Conveniência: pontua a partir de um `Lead` completo. */
export function leadToFields(lead: Lead): LeadFields {
  return {
    name: lead.name,
    emails: lead.emails,
    phones: lead.phones,
    company: lead.company,
    jobTitle: lead.jobTitle,
    source: lead.source,
    city: lead.city,
  };
}
