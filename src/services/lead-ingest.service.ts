import { companyNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toOpportunityDTO } from "@/src/mappers/opportunity.mapper";
import { toPersonDTO } from "@/src/mappers/person.mapper";
import { CompanyRepository } from "@/src/repositories/company.repository";
import { OpportunityRepository } from "@/src/repositories/opportunity.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import type {
  IngestLeadInput,
  IngestLeadResult,
} from "@/src/schemas/lead-ingest.schema";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";

/** Garante que uma Company referenciada (se houver) pertence à workspace. */
async function assertCompany(
  workspaceId: string,
  companyId: string | null | undefined,
): Promise<Result<true>> {
  if (!companyId) return ok(true);
  const exists = await CompanyRepository.existsInWorkspace(
    companyId,
    workspaceId,
  );
  if (!exists.ok) return exists;
  if (!exists.value) return err(companyNotFound());
  return ok(true);
}

export const LeadIngestService = {
  /**
   * Abre uma oportunidade a partir de um lead. A pessoa é deduplicada por
   * e-mail/telefone na workspace: se já existir, a oportunidade é vinculada
   * a ela; caso contrário, uma nova pessoa é criada. Dispara os eventos de
   * workflow (`person.created` quando nova, `opportunity.created` sempre)
   * para que automações reajam ao novo lead.
   */
  async ingest(
    workspaceId: string,
    actorUserId: string,
    input: IngestLeadInput,
  ): Promise<Result<IngestLeadResult>> {
    const { person: personInput, opportunity: oppInput } = input;

    const personCompany = await assertCompany(
      workspaceId,
      personInput.companyId,
    );
    if (!personCompany.ok) return personCompany;
    const oppCompany = await assertCompany(workspaceId, oppInput?.companyId);
    if (!oppCompany.ok) return oppCompany;

    // Deduplicação: reaproveita uma pessoa existente quando há match.
    const existing = await PersonRepository.findByEmailOrPhone(
      workspaceId,
      personInput.emails,
      personInput.phones,
    );
    if (!existing.ok) return existing;

    let personReused = !!existing.value;
    let person = existing.value;

    if (!person) {
      const created = await PersonRepository.create({
        workspaceId,
        createdById: actorUserId,
        name: personInput.name,
        emails: personInput.emails,
        phones: personInput.phones,
        city: personInput.city ?? null,
        jobTitle: personInput.jobTitle ?? null,
        linkedin: personInput.linkedin ?? null,
        avatar: personInput.avatar ?? null,
        companyId: personInput.companyId ?? null,
      });
      if (!created.ok) return created;
      person = created.value;
      personReused = false;
    }

    const personDTO = toPersonDTO(person);
    if (!personReused) {
      await dispatchRecordEvent({
        workspaceId,
        actingUserId: actorUserId,
        entity: "person",
        event: "created",
        record: personDTO,
      });
    }

    const opportunity = await OpportunityRepository.create({
      workspaceId,
      createdById: actorUserId,
      name: oppInput?.name ?? person.name,
      amount: oppInput?.amount ?? null,
      closeDate: oppInput?.closeDate ? new Date(oppInput.closeDate) : null,
      stage: oppInput?.stage ?? "NEW",
      companyId: oppInput?.companyId ?? person.companyId,
      pointOfContactId: person.id,
      ownerId: oppInput?.ownerId ?? null,
      source: oppInput?.source ?? null,
    });
    if (!opportunity.ok) return opportunity;

    const opportunityDTO = toOpportunityDTO(opportunity.value);
    await dispatchRecordEvent({
      workspaceId,
      actingUserId: actorUserId,
      entity: "opportunity",
      event: "created",
      record: opportunityDTO,
    });

    return ok({
      personReused,
      person: personDTO,
      opportunity: opportunityDTO,
    });
  },
};
