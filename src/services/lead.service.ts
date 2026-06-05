import type { Lead } from "@prisma/client";
import { leadAlreadyConverted, leadNotFound } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toLeadDTO } from "@/src/mappers/lead.mapper";
import {
  LeadRepository,
  type UpdateLeadData,
} from "@/src/repositories/lead.repository";
import type {
  CreateLeadInput,
  LeadDTO,
  UpdateLeadInput,
} from "@/src/schemas/lead.schema";
import type { IngestLeadInput } from "@/src/schemas/lead-ingest.schema";
import { LeadIngestService } from "@/src/services/lead-ingest.service";
import { resolveLeadOwner } from "@/src/services/lead-routing";
import { computeLeadScore } from "@/src/services/lead-scoring";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

type LeadFields = Parameters<typeof computeLeadScore>[1];

/** Campos de condição (para recalcular o score em mudanças relevantes). */
const SCORING_FIELDS = new Set([
  "name",
  "emails",
  "phones",
  "company",
  "jobTitle",
  "source",
  "city",
]);

function fieldsOf(lead: {
  name: string;
  emails: string[];
  phones: string[];
  company: string | null;
  jobTitle: string | null;
  source: string | null;
  city: string | null;
}): LeadFields {
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

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Lead>> {
  const found = await LeadRepository.findById(id);
  if (!found.ok) return found;
  const lead = found.value;
  if (!lead || lead.workspaceId !== workspaceId || lead.deletedAt) {
    return err(leadNotFound());
  }
  return ok(lead);
}

/** Cria um lead pontuado e roteado a partir de campos brutos (sem permissão). */
async function createScored(
  workspaceId: string,
  createdById: string,
  input: {
    name: string;
    emails: string[];
    phones: string[];
    company?: string | null;
    jobTitle?: string | null;
    city?: string | null;
    linkedin?: string | null;
    source?: string | null;
    status?: Lead["status"];
    ownerId?: string | null;
  },
): Promise<Result<Lead>> {
  const fields: LeadFields = {
    name: input.name,
    emails: input.emails,
    phones: input.phones,
    company: input.company ?? null,
    jobTitle: input.jobTitle ?? null,
    source: input.source ?? null,
    city: input.city ?? null,
  };

  const scored = await computeLeadScore(workspaceId, fields);
  if (!scored.ok) return scored;

  let ownerId = input.ownerId ?? null;
  if (!ownerId) {
    const routed = await resolveLeadOwner(workspaceId, fields);
    if (!routed.ok) return routed;
    ownerId = routed.value;
  }

  return LeadRepository.create({
    workspaceId,
    createdById,
    name: input.name,
    emails: input.emails,
    phones: input.phones,
    company: input.company ?? null,
    jobTitle: input.jobTitle ?? null,
    city: input.city ?? null,
    linkedin: input.linkedin ?? null,
    source: input.source ?? null,
    status: input.status ?? "NEW",
    score: scored.value,
    ownerId,
  });
}

export const LeadService = {
  async create(
    userId: string,
    slug: string,
    input: CreateLeadInput,
  ): Promise<Result<LeadDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "CREATE",
    });
    if (!ws.ok) return ws;

    const created = await createScored(ws.value, userId, input);
    if (!created.ok) return created;
    return ok(toLeadDTO(created.value));
  },

  /** Entrada de marketing (forms/integração): cria o Lead pontuado/roteado. */
  async createFromIngest(
    workspaceId: string,
    actorUserId: string,
    input: IngestLeadInput,
  ): Promise<Result<LeadDTO>> {
    const { person, opportunity } = input;
    const created = await createScored(workspaceId, actorUserId, {
      name: person.name,
      emails: person.emails ?? [],
      phones: person.phones ?? [],
      jobTitle: person.jobTitle ?? null,
      city: person.city ?? null,
      linkedin: person.linkedin ?? null,
      source: opportunity?.source ?? null,
    });
    if (!created.ok) return created;
    return ok(toLeadDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<LeadDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const result = await LeadRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map(toLeadDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LeadDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "VIEW",
    });
    if (!ws.ok) return ws;
    const lead = await loadInWorkspace(ws.value, id);
    if (!lead.ok) return lead;
    return ok(toLeadDTO(lead.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateLeadInput,
  ): Promise<Result<LeadDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const data: UpdateLeadData = { updatedById: userId, ...input };
    const updated = await LeadRepository.update(id, data);
    if (!updated.ok) return updated;

    // Recalcula o score quando algum campo de condição mudou.
    const touchedScoring = Object.keys(input).some((k) =>
      SCORING_FIELDS.has(k),
    );
    if (touchedScoring) {
      const scored = await computeLeadScore(ws.value, fieldsOf(updated.value));
      if (scored.ok && scored.value !== updated.value.score) {
        const rescored = await LeadRepository.update(id, {
          updatedById: userId,
          score: scored.value,
        });
        if (rescored.ok) return ok(toLeadDTO(rescored.value));
      }
    }
    return ok(toLeadDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LeadDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "DELETE",
    });
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const removed = await LeadRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toLeadDTO(removed.value));
  },

  async reorder(
    userId: string,
    slug: string,
    ids: string[],
  ): Promise<Result<true>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;
    return LeadRepository.reorder(ws.value, ids);
  },

  /** Converte o lead em Pessoa + Oportunidade (reusa o ingest), marca CONVERTED. */
  async convert(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<LeadDTO>> {
    const ws = await resolveWorkspaceId(userId, slug, {
      resource: "leads",
      action: "EDIT",
    });
    if (!ws.ok) return ws;

    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    if (
      existing.value.status === "CONVERTED" ||
      existing.value.convertedPersonId
    ) {
      return err(leadAlreadyConverted());
    }
    const lead = existing.value;

    const ingest = await LeadIngestService.ingest(ws.value, userId, {
      person: {
        name: lead.name,
        emails: lead.emails,
        phones: lead.phones,
        city: lead.city ?? undefined,
        jobTitle: lead.jobTitle ?? undefined,
        linkedin: lead.linkedin ?? undefined,
      },
      opportunity: {
        name: lead.name,
        source: lead.source ?? undefined,
        ownerId: lead.ownerId ?? undefined,
      },
    });
    if (!ingest.ok) return ingest;

    const updated = await LeadRepository.update(id, {
      updatedById: userId,
      status: "CONVERTED",
      convertedPersonId: ingest.value.person.id,
      convertedOpportunityId: ingest.value.opportunity.id,
    });
    if (!updated.ok) return updated;
    return ok(toLeadDTO(updated.value));
  },
};
