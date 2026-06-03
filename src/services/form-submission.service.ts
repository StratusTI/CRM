import { createHash } from "node:crypto";
import type { Form } from "@prisma/client";
import { z } from "zod";
import { formNotPublished, validationError } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toCompanyDTO } from "@/src/mappers/company.mapper";
import { toPersonDTO } from "@/src/mappers/person.mapper";
import { CompanyRepository } from "@/src/repositories/company.repository";
import { FormRepository } from "@/src/repositories/form.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import {
  type ActionConfig,
  buildSubmissionSchema,
  type FormFieldDef,
  type FormSubmissionInput,
} from "@/src/schemas/form.schema";
import type { LeadOpportunityInput } from "@/src/schemas/lead-ingest.schema";
import type { OPPORTUNITY_STAGES } from "@/src/schemas/opportunity.schema";
import { normalizeBrazilPhone, normalizeDomain } from "@/src/schemas/shared";
import { LeadIngestService } from "@/src/services/lead-ingest.service";
import { dispatchRecordEvent } from "@/src/services/workflow-dispatcher";

/** Contexto da submissão pública, extraído do request (nunca do corpo). */
export type SubmitContext = { ip: string; referrer: string | null };

export type SubmitResult = {
  redirectUrl: string | null;
  message: string | null;
};

/**
 * Hash salgado do IP do visitante. Nunca guardamos o IP cru (LGPD); o hash só
 * serve para correlacionar submissões sem expor o endereço.
 */
function hashIp(ip: string): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? "nexo-form";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function fieldsOf(form: Form): FormFieldDef[] {
  return (form.fields as unknown as FormFieldDef[] | null) ?? [];
}

function configOf(form: Form): ActionConfig {
  return (form.actionConfig as unknown as ActionConfig | null) ?? {};
}

type Mapped = {
  person: Record<string, unknown>;
  company: Record<string, unknown>;
  opportunity: Record<string, unknown>;
  emails: string[];
  phones: string[];
};

/** Distribui os valores validados nos atributos das entidades alvo. */
function mapValues(
  fields: FormFieldDef[],
  values: Record<string, unknown>,
): Mapped {
  const acc: Mapped = {
    person: {},
    company: {},
    opportunity: {},
    emails: [],
    phones: [],
  };
  for (const field of fields) {
    const raw = values[field.key];
    const { target, attribute } = field.mapping;

    if (target === "person" && attribute === "email") {
      if (typeof raw === "string" && raw.trim()) acc.emails.push(raw.trim());
      continue;
    }
    if (target === "person" && attribute === "phone") {
      if (typeof raw === "string" && raw.trim()) {
        acc.phones.push(normalizeBrazilPhone(raw));
      }
      continue;
    }
    if (raw === undefined || raw === null || raw === "") continue;
    acc[target][attribute] = raw;
  }
  return acc;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export const FormSubmissionService = {
  /**
   * Recebe uma submissão pública: valida os valores conforme as definições de
   * campo, executa a ação configurada (cria empresa, pessoa ou lead) atribuindo
   * os registros ao criador do formulário, e registra a submissão.
   */
  async submit(
    token: string,
    input: FormSubmissionInput,
    ctx: SubmitContext,
  ): Promise<Result<SubmitResult>> {
    const found = await FormRepository.findByPublicToken(token);
    if (!found.ok) return found;
    const form = found.value;
    if (!form || form.status !== "PUBLISHED") return err(formNotPublished());

    // Honeypot: bots preenchem o campo oculto. Sucesso silencioso, sem gravar.
    if (input._hp && input._hp.trim() !== "") {
      return ok({
        redirectUrl: form.redirectUrl,
        message: form.successMessage,
      });
    }

    const fields = fieldsOf(form);
    const schema = buildSubmissionSchema(fields);
    const parsed = schema.safeParse(input.values ?? {});
    if (!parsed.success) {
      return err(
        validationError("Dados inválidos", z.flattenError(parsed.error)),
      );
    }
    const values = parsed.data;
    const mapped = mapValues(fields, values);
    const config = configOf(form);

    const workspaceId = form.workspaceId;
    const actorUserId = form.createdById;

    let createdPersonId: string | null = null;
    let createdCompanyId: string | null = null;
    let createdOpportunityId: string | null = null;
    let personReused = false;

    if (form.action === "LEAD") {
      const result = await ingestLead(workspaceId, actorUserId, mapped, config);
      if (!result.ok) return result;
      createdPersonId = result.value.personId;
      createdOpportunityId = result.value.opportunityId;
      personReused = result.value.personReused;
    } else if (form.action === "PERSON") {
      const result = await upsertPerson(workspaceId, actorUserId, mapped);
      if (!result.ok) return result;
      createdPersonId = result.value.personId;
      personReused = result.value.personReused;
    } else {
      const result = await upsertCompany(
        workspaceId,
        actorUserId,
        mapped,
        config,
      );
      if (!result.ok) return result;
      createdCompanyId = result.value.companyId;
    }

    await FormRepository.recordSubmission({
      formId: form.id,
      action: form.action,
      values,
      createdPersonId,
      createdCompanyId,
      createdOpportunityId,
      personReused,
      ipHash: hashIp(ctx.ip),
      referrer: ctx.referrer,
    });

    return ok({ redirectUrl: form.redirectUrl, message: form.successMessage });
  },
};

/** LEAD: reusa a ingestão de leads (deduplica pessoa, abre oportunidade). */
async function ingestLead(
  workspaceId: string,
  actorUserId: string,
  mapped: Mapped,
  config: ActionConfig,
): Promise<
  Result<{ personId: string; opportunityId: string; personReused: boolean }>
> {
  const opportunity: LeadOpportunityInput = {
    name: str(mapped.opportunity.name) ?? config.opportunityName,
    amount: num(mapped.opportunity.amount),
    closeDate: str(mapped.opportunity.closeDate),
    stage:
      (str(mapped.opportunity.stage) as
        | (typeof OPPORTUNITY_STAGES)[number]
        | undefined) ??
      config.opportunityStage ??
      "NEW",
    source: str(mapped.opportunity.source) ?? config.opportunitySource,
  };

  const result = await LeadIngestService.ingest(workspaceId, actorUserId, {
    person: {
      name: str(mapped.person.name) ?? "",
      emails: mapped.emails,
      phones: mapped.phones,
      city: str(mapped.person.city),
      jobTitle: str(mapped.person.jobTitle),
      linkedin: str(mapped.person.linkedin),
      avatar: str(mapped.person.avatar),
    },
    opportunity,
  });
  if (!result.ok) return result;
  return ok({
    personId: result.value.person.id,
    opportunityId: result.value.opportunity.id,
    personReused: result.value.personReused,
  });
}

/** PERSON: deduplica por e-mail/telefone, reutilizando uma pessoa existente. */
async function upsertPerson(
  workspaceId: string,
  actorUserId: string,
  mapped: Mapped,
): Promise<Result<{ personId: string; personReused: boolean }>> {
  const existing = await PersonRepository.findByEmailOrPhone(
    workspaceId,
    mapped.emails,
    mapped.phones,
  );
  if (!existing.ok) return existing;

  if (existing.value) {
    return ok({ personId: existing.value.id, personReused: true });
  }

  const created = await PersonRepository.create({
    workspaceId,
    createdById: actorUserId,
    name: str(mapped.person.name) ?? "",
    emails: mapped.emails,
    phones: mapped.phones,
    city: str(mapped.person.city) ?? null,
    jobTitle: str(mapped.person.jobTitle) ?? null,
    linkedin: str(mapped.person.linkedin) ?? null,
    avatar: str(mapped.person.avatar) ?? null,
    companyId: null,
  });
  if (!created.ok) return created;

  await dispatchRecordEvent({
    workspaceId,
    actingUserId: actorUserId,
    entity: "person",
    event: "created",
    record: toPersonDTO(created.value),
  });
  return ok({ personId: created.value.id, personReused: false });
}

/** COMPANY: reutiliza empresa existente por domínio/CNPJ, ou cria uma nova. */
async function upsertCompany(
  workspaceId: string,
  actorUserId: string,
  mapped: Mapped,
  config: ActionConfig,
): Promise<Result<{ companyId: string }>> {
  // Normaliza para host puro (`acme.com`), mesmo que o campo seja do tipo URL
  // — mantém o dedupe por domínio consistente com o schema de Company.
  const domainRaw = str(mapped.company.domain);
  const domain = domainRaw ? normalizeDomain(domainRaw) : undefined;
  const cnpj = str(mapped.company.cnpj);

  if (domain) {
    const byDomain = await CompanyRepository.findByDomain(workspaceId, domain);
    if (!byDomain.ok) return byDomain;
    if (byDomain.value) return ok({ companyId: byDomain.value.id });
  }
  if (cnpj) {
    const byCnpj = await CompanyRepository.findByCnpj(workspaceId, cnpj);
    if (!byCnpj.ok) return byCnpj;
    if (byCnpj.value) return ok({ companyId: byCnpj.value.id });
  }

  const created = await CompanyRepository.create({
    workspaceId,
    createdById: actorUserId,
    name: str(mapped.company.name) ?? "",
    cnpj: cnpj ?? null,
    domain: domain ?? null,
    employees: num(mapped.company.employees) ?? null,
    linkedin: str(mapped.company.linkedin) ?? null,
    address: null,
    arr: num(mapped.company.arr) ?? null,
    icp: config.icp ?? false,
    accountOwnerId: null,
  });
  if (!created.ok) return created;

  await dispatchRecordEvent({
    workspaceId,
    actingUserId: actorUserId,
    entity: "company",
    event: "created",
    record: toCompanyDTO(created.value),
  });
  return ok({ companyId: created.value.id });
}
