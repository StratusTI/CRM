import { matchesCondition } from "@/src/lib/lead-rules";
import { ok, type Result } from "@/src/lib/result";
import { LeadRepository } from "@/src/repositories/lead.repository";
import { LeadRoutingRuleRepository } from "@/src/repositories/lead-rule.repository";
import { MembershipRepository } from "@/src/repositories/membership.repository";

type LeadFields = Parameters<typeof matchesCondition>[0];

/**
 * Resolve o responsável de um lead: a primeira regra de roteamento ativa que
 * casa define o owner; sem match, **round-robin** = membro do workspace com
 * menos leads ativos. Retorna `null` quando não há membros.
 */
export async function resolveLeadOwner(
  workspaceId: string,
  lead: LeadFields,
): Promise<Result<string | null>> {
  const rules = await LeadRoutingRuleRepository.listActive(workspaceId);
  if (!rules.ok) return rules;

  for (const rule of rules.value) {
    if (matchesCondition(lead, rule.field, rule.operator, rule.value)) {
      return ok(rule.ownerId);
    }
  }

  // Fallback round-robin: o membro com menos leads ativos.
  const members = await MembershipRepository.listByWorkspaceId(workspaceId);
  if (!members.ok) return members;
  if (members.value.length === 0) return ok(null);

  const counts = await LeadRepository.countActiveByOwner(workspaceId);
  if (!counts.ok) return counts;

  let chosen = members.value[0].user.id;
  let min = counts.value.get(chosen) ?? 0;
  for (const m of members.value) {
    const c = counts.value.get(m.user.id) ?? 0;
    if (c < min) {
      min = c;
      chosen = m.user.id;
    }
  }
  return ok(chosen);
}
