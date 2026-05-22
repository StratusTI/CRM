import {
  companyNotFound,
  opportunityNotFound,
  personNotFound,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { CompanyRepository } from "@/src/repositories/company.repository";
import { OpportunityRepository } from "@/src/repositories/opportunity.repository";
import { PersonRepository } from "@/src/repositories/person.repository";

export type RelationRefs = {
  companyId?: string | null;
  personId?: string | null;
  opportunityId?: string | null;
};

/**
 * Valida que as relações (company/person/opportunity) referenciadas existem na
 * workspace. Cada uma só é checada quando presente e não-nula. Compartilhado
 * por Task e Note, cujo conceito de "relação" aponta para essas três entidades.
 */
export async function assertRelationRefs(
  workspaceId: string,
  refs: RelationRefs,
): Promise<Result<true>> {
  if (refs.companyId) {
    const exists = await CompanyRepository.existsInWorkspace(
      refs.companyId,
      workspaceId,
    );
    if (!exists.ok) return exists;
    if (!exists.value) return err(companyNotFound());
  }
  if (refs.personId) {
    const exists = await PersonRepository.existsInWorkspace(
      refs.personId,
      workspaceId,
    );
    if (!exists.ok) return exists;
    if (!exists.value) return err(personNotFound());
  }
  if (refs.opportunityId) {
    const exists = await OpportunityRepository.existsInWorkspace(
      refs.opportunityId,
      workspaceId,
    );
    if (!exists.ok) return exists;
    if (!exists.value) return err(opportunityNotFound());
  }
  return ok(true);
}
