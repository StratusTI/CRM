import { Cron } from "croner";
import {
  parseDefinition,
  triggerTypeToPrisma,
} from "@/src/mappers/workflow.mapper";
import { WorkflowRepository } from "@/src/repositories/workflow.repository";
import { WorkflowRunRepository } from "@/src/repositories/workflow-run.repository";
import { runWorkflow } from "@/src/services/workflow-runner";

/**
 * Tick do scheduler — chamado por um cron externo (1x por minuto).
 *
 * Itera todos os workflows ACTIVE, filtra os que têm trigger
 * `on-a-schedule`, e dispara aqueles cuja "última hora prevista de execução"
 * (`previousRun`) é posterior ao `lastRunAt` registrado. Isso garante
 * idempotência mesmo se o tick rodar duas vezes no mesmo minuto.
 *
 * Tolerância: ignora `previousRun` mais antigo que 5 minutos — caso o tick
 * fique parado, não disparamos um backlog acumulado.
 */
const TOLERANCE_MS = 5 * 60 * 1000;

export async function workflowSchedulerTick(now = new Date()): Promise<{
  considered: number;
  dispatched: number;
  errors: number;
}> {
  let considered = 0;
  let dispatched = 0;
  let errors = 0;

  const workflows = await WorkflowRepository.findAllActive();
  if (!workflows.ok) return { considered: 0, dispatched: 0, errors: 1 };

  for (const wf of workflows.value) {
    if (!wf.activeVersion) continue;
    const definition = parseDefinition(wf.activeVersion.definition);
    const trigger = definition.trigger.data;
    if (!trigger || trigger.type !== "on-a-schedule") continue;
    considered++;

    try {
      const cron = new Cron(trigger.cron, { timezone: trigger.timezone });
      const [prev] = cron.previousRuns(1, now);
      if (!prev) continue;
      if (now.getTime() - prev.getTime() > TOLERANCE_MS) continue;
      if (wf.lastRunAt && prev <= wf.lastRunAt) continue;

      const payload = { scheduledFor: prev.toISOString() };
      const run = await WorkflowRunRepository.create({
        workflowId: wf.id,
        versionId: wf.activeVersion.id,
        triggerType: triggerTypeToPrisma("on-a-schedule"),
        triggerPayload: payload,
        startedById: null,
      });
      if (!run.ok) {
        errors++;
        continue;
      }

      // Marca antes de rodar pra evitar disparo duplo se o tick concorrer.
      await WorkflowRepository.update(wf.id, {
        updatedById: wf.createdById,
        lastRunAt: prev,
      });

      // Fire-and-forget — erros do runner ficam no próprio WorkflowRun.
      void runWorkflow({
        runId: run.value.id,
        workspaceId: wf.workspaceId,
        actingUserId: wf.createdById,
        definition,
        triggerType: "on-a-schedule",
        triggerPayload: payload,
        testMode: false,
      }).catch(() => {
        /* persistido no run */
      });
      dispatched++;
    } catch {
      errors++;
    }
  }
  return { considered, dispatched, errors };
}
