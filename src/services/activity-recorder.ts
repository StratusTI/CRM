import type { ActivityAction, Prisma } from "@prisma/client";
import { ActivityRepository } from "@/src/repositories/activity.repository";
import type { WorkflowEntity } from "@/src/schemas/workflow.schema";

type Event = "created" | "updated" | "deleted";

const EVENT_TO_ACTION: Record<Event, ActivityAction> = {
  created: "CREATED",
  updated: "UPDATED",
  deleted: "DELETED",
};

const ENTITY_LABEL: Record<WorkflowEntity, string> = {
  company: "Empresa",
  person: "Pessoa",
  opportunity: "Oportunidade",
  task: "Tarefa",
  note: "Anotação",
};

const ACTION_LABEL: Record<Event, string> = {
  created: "criou",
  updated: "atualizou",
  deleted: "removeu",
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Resolve os vínculos de timeline (company/person/opportunity) a partir do DTO.
 * Para a própria entidade, o `id` é o vínculo (ex.: company → companyId = id).
 * Para entidades-filho (task/note/opportunity) usa os FKs do record.
 */
function resolveLinks(
  entity: WorkflowEntity,
  record: Record<string, unknown>,
): {
  companyId: string | null;
  personId: string | null;
  opportunityId: string | null;
} {
  const id = str(record.id);
  return {
    companyId: entity === "company" ? id : str(record.companyId),
    personId:
      entity === "person"
        ? id
        : (str(record.personId) ?? str(record.pointOfContactId)),
    opportunityId: entity === "opportunity" ? id : str(record.opportunityId),
  };
}

/** Texto curto para a timeline/audit (ex.: "atualizou Empresa Acme"). */
function buildSummary(
  entity: WorkflowEntity,
  event: Event,
  record: Record<string, unknown>,
): string {
  const name = str(record.name) ?? str(record.title) ?? "";
  const base = `${ACTION_LABEL[event]} ${ENTITY_LABEL[entity]}`;
  return name ? `${base} ${name}` : base;
}

/**
 * Persiste uma Activity a partir de um evento de CRUD. Chamado por
 * `dispatchRecordEvent`. **Nunca lança** — uma falha de auditoria não pode
 * derrubar a operação principal.
 */
export async function recordActivity(params: {
  workspaceId: string;
  actingUserId: string;
  entity: WorkflowEntity;
  event: Event;
  record: unknown;
  changedFields?: string[];
}): Promise<void> {
  try {
    const record =
      params.record && typeof params.record === "object"
        ? (params.record as Record<string, unknown>)
        : {};
    const entityId = str(record.id);
    if (!entityId) return; // sem id não há o que rastrear

    const links = resolveLinks(params.entity, record);

    await ActivityRepository.create({
      workspaceId: params.workspaceId,
      actorUserId: params.actingUserId,
      action: EVENT_TO_ACTION[params.event],
      entity: params.entity,
      entityId,
      companyId: links.companyId,
      personId: links.personId,
      opportunityId: links.opportunityId,
      changedFields: params.changedFields ?? [],
      data: record as Prisma.InputJsonValue,
      summary: buildSummary(params.entity, params.event, record),
    });
  } catch {
    // Auditoria é best-effort: não propaga erro ao caller.
  }
}
