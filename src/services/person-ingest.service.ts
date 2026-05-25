import { companyNotFound } from "@/src/errors/app-error";
import { ok, type Result } from "@/src/lib/result";
import { CompanyRepository } from "@/src/repositories/company.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import type { CreatePersonInput } from "@/src/schemas/person.schema";
import type {
  IngestItemResult,
  IngestPeopleReport,
} from "@/src/schemas/person-ingest.schema";

/** Cria uma pessoa do lote, validando a Company referenciada (se houver). */
async function ingestOne(
  workspaceId: string,
  actorUserId: string,
  index: number,
  input: CreatePersonInput,
): Promise<IngestItemResult> {
  if (input.companyId) {
    const exists = await CompanyRepository.existsInWorkspace(
      input.companyId,
      workspaceId,
    );
    if (!exists.ok) {
      return failed(index, exists.error);
    }
    if (!exists.value) {
      return failed(index, companyNotFound());
    }
  }

  const created = await PersonRepository.create({
    workspaceId,
    createdById: actorUserId,
    name: input.name,
    emails: input.emails,
    phones: input.phones,
    city: input.city ?? null,
    jobTitle: input.jobTitle ?? null,
    linkedin: input.linkedin ?? null,
    avatar: input.avatar ?? null,
    companyId: input.companyId ?? null,
  });
  if (!created.ok) return failed(index, created.error);

  return { index, status: "created", id: created.value.id };
}

function failed(
  index: number,
  error: { code: string; message: string },
): IngestItemResult {
  return {
    index,
    status: "failed",
    error: { code: error.code, message: error.message },
  };
}

export const PersonIngestService = {
  /**
   * Ingere um lote de pessoas. Cada item é processado de forma independente —
   * uma falha não aborta as demais. Sempre retorna ok com o relatório.
   */
  async ingest(
    workspaceId: string,
    actorUserId: string,
    people: CreatePersonInput[],
  ): Promise<Result<IngestPeopleReport>> {
    const results: IngestItemResult[] = [];
    for (const [index, input] of people.entries()) {
      results.push(await ingestOne(workspaceId, actorUserId, index, input));
    }

    const created = results.filter((r) => r.status === "created").length;
    return ok({
      total: results.length,
      created,
      failed: results.length - created,
      results,
    });
  },
};
