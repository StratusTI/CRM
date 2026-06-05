import { ok, type Result } from "@/src/lib/result";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { UserRepository } from "@/src/repositories/user.repository";

export type DeletionTickResult = {
  considered: number;
  anonymized: number;
  skipped: number;
  errors: number;
};

/**
 * Anonimiza uma conta vencida (LGPD). Re-checa o bloqueio de "último
 * proprietário" antes de processar — uma membership pode ter mudado durante a
 * carência. Retorna `false` quando pulou (ainda é único dono de alguma ws).
 */
async function anonymizeIfAllowed(userId: string): Promise<Result<boolean>> {
  const sole = await MembershipRepository.listSoleOwnerWorkspaces(userId);
  if (!sole.ok) return sole;
  if (sole.value.length > 0) return ok(false); // ainda bloqueado → pula

  const result = await UserRepository.anonymize(userId, new Date());
  if (!result.ok) return result;
  return ok(true);
}

/**
 * Tick do cron de exclusão de contas. Busca usuários com a carência vencida
 * e ainda não anonimizados, e anonimiza cada um. Idempotente: `anonymizedAt`
 * impede reprocessamento.
 */
export async function accountDeletionTick(): Promise<DeletionTickResult> {
  const due = await UserRepository.findDueForDeletion(new Date());
  if (!due.ok) {
    return { considered: 0, anonymized: 0, skipped: 0, errors: 1 };
  }

  let anonymized = 0;
  let skipped = 0;
  let errors = 0;
  for (const user of due.value) {
    const result = await anonymizeIfAllowed(user.id);
    if (!result.ok) errors += 1;
    else if (result.value) anonymized += 1;
    else skipped += 1;
  }

  return { considered: due.value.length, anonymized, skipped, errors };
}
