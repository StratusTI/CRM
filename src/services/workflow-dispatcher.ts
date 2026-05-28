import {
  parseDefinition,
  triggerTypeToPrisma,
} from "@/src/mappers/workflow.mapper";
import { WorkflowRepository } from "@/src/repositories/workflow.repository";
import { WorkflowRunRepository } from "@/src/repositories/workflow-run.repository";
import type {
  WorkflowEntity,
  WorkflowTriggerType,
} from "@/src/schemas/workflow.schema";
import { runWorkflow } from "@/src/services/workflow-runner";

type Event = "created" | "updated" | "deleted";

const EVENT_TO_TRIGGER: Record<Event, WorkflowTriggerType[]> = {
  created: ["record-is-created", "record-is-created-or-updated"],
  updated: ["record-is-updated", "record-is-created-or-updated"],
  deleted: ["record-is-deleted"],
};

/**
 * Disparado pelos services CRUD (Person/Company/Opportunity/Task/Note) após
 * commit. Carrega workflows ACTIVE da workspace, filtra pelos que casam com
 * `(entity, event)` e enfileira runs. Execução in-process (await) — quando
 * o engine virar fila, esse arquivo é o único ponto que muda.
 *
 * `record` é o DTO da entidade afetada (campo `record` do scope no runner);
 * `changedFields` só é usado quando o trigger declara campos observados.
 */
export async function dispatchRecordEvent(params: {
  workspaceId: string;
  actingUserId: string;
  entity: WorkflowEntity;
  event: Event;
  record: unknown;
  changedFields?: string[];
}): Promise<void> {
  const candidates = EVENT_TO_TRIGGER[params.event];
  const wfList = await WorkflowRepository.findActiveByEntity(
    params.workspaceId,
  );
  if (!wfList.ok || wfList.value.length === 0) return;

  for (const wf of wfList.value) {
    if (!wf.activeVersion) continue;
    const definition = parseDefinition(wf.activeVersion.definition);
    const trigger = definition.trigger.data;
    if (!trigger) continue;
    if (!candidates.includes(trigger.type)) continue;
    if ("entity" in trigger && trigger.entity !== params.entity) continue;

    // Trigger update/created-or-updated com `fields` exige interseção.
    if (
      "fields" in trigger &&
      Array.isArray(trigger.fields) &&
      trigger.fields.length > 0 &&
      params.changedFields &&
      params.changedFields.length > 0
    ) {
      const hit = params.changedFields.some((f) => trigger.fields.includes(f));
      if (!hit) continue;
    }

    const payload = {
      event: params.event,
      record: params.record,
      changedFields: params.changedFields ?? [],
    };
    const run = await WorkflowRunRepository.create({
      workflowId: wf.id,
      versionId: wf.activeVersion.id,
      triggerType: triggerTypeToPrisma(triggerKeyFor(params.event, trigger.type)),
      triggerPayload: payload as object,
      startedById: params.actingUserId,
    });
    if (!run.ok) continue;

    // Não bloqueia o caller; runner cuida do status. Erros do runner ficam
    // gravados no próprio run + steps.
    void runWorkflow({
      runId: run.value.id,
      workspaceId: params.workspaceId,
      actingUserId: params.actingUserId,
      definition,
      triggerType: trigger.type,
      triggerPayload: payload,
      testMode: false,
    }).catch(() => {
      // erros já estão persistidos no WorkflowRun pelo próprio runner.
    });
  }
}

function triggerKeyFor(
  event: Event,
  triggerType: WorkflowTriggerType,
): WorkflowTriggerType {
  // Preferimos preservar o tipo declarado pelo trigger pra rastreabilidade.
  if (triggerType === "record-is-created-or-updated") return triggerType;
  switch (event) {
    case "created":
      return "record-is-created";
    case "updated":
      return "record-is-updated";
    case "deleted":
      return "record-is-deleted";
  }
}
