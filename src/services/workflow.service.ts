import type { Workflow } from "@prisma/client";
import {
  validationError,
  workflowExecutionFailed,
  workflowInvalidDefinition,
  workflowNotFound,
  workflowVersionNotDraft,
  workflowVersionNotFound,
  workflowWebhookInvalid,
} from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import {
  parseDefinition,
  toWorkflowDTO,
  toWorkflowRunDTO,
  toWorkflowVersionDTO,
  triggerTypeToPrisma,
} from "@/src/mappers/workflow.mapper";
import { WorkflowRepository } from "@/src/repositories/workflow.repository";
import { WorkflowRunRepository } from "@/src/repositories/workflow-run.repository";
import { WorkflowVersionRepository } from "@/src/repositories/workflow-version.repository";
import {
  type CreateWorkflowInput,
  type ResumeRunInput,
  type TriggerManualRunInput,
  type UpdateWorkflowDraftInput,
  type UpdateWorkflowInput,
  type WorkflowDefinition,
  WorkflowDefinitionSchema,
  type WorkflowDTO,
  type WorkflowRunDTO,
  type WorkflowVersionDTO,
} from "@/src/schemas/workflow.schema";
import { resumeWorkflow, runWorkflow } from "@/src/services/workflow-runner";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

function emptyDefinition(): WorkflowDefinition {
  return {
    trigger: { id: "trigger", position: { x: 0, y: 0 }, data: null },
    nodes: [],
    edges: [],
  };
}

async function loadInWorkspace(
  workspaceId: string,
  id: string,
): Promise<Result<Workflow>> {
  const found = await WorkflowRepository.findById(id);
  if (!found.ok) return found;
  if (
    !found.value ||
    found.value.workspaceId !== workspaceId ||
    found.value.deletedAt
  ) {
    return err(workflowNotFound());
  }
  return ok(found.value);
}

export const WorkflowService = {
  async create(
    userId: string,
    slug: string,
    input: CreateWorkflowInput,
  ): Promise<Result<WorkflowDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const created = await WorkflowRepository.create({
      workspaceId: ws.value,
      createdById: userId,
      name: input.name,
      description: input.description ?? null,
      initialDefinition: emptyDefinition(),
    });
    if (!created.ok) return created;
    return ok(toWorkflowDTO(created.value));
  },

  async list(userId: string, slug: string): Promise<Result<WorkflowDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const list = await WorkflowRepository.listByWorkspace(ws.value);
    if (!list.ok) return list;
    return ok(list.value.map(toWorkflowDTO));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const wf = await loadInWorkspace(ws.value, id);
    if (!wf.ok) return wf;
    return ok(toWorkflowDTO(wf.value));
  },

  async update(
    userId: string,
    slug: string,
    id: string,
    input: UpdateWorkflowInput,
  ): Promise<Result<WorkflowDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const updated = await WorkflowRepository.update(id, {
      updatedById: userId,
      ...input,
      description:
        input.description === undefined ? undefined : input.description,
    });
    if (!updated.ok) return updated;
    return ok(toWorkflowDTO(updated.value));
  },

  async remove(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const removed = await WorkflowRepository.softDelete(id, userId);
    if (!removed.ok) return removed;
    return ok(toWorkflowDTO(removed.value));
  },

  async getDraft(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowVersionDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const draft = await WorkflowVersionRepository.findDraft(id);
    if (!draft.ok) return draft;
    if (!draft.value) return err(workflowVersionNotFound());
    return ok(toWorkflowVersionDTO(draft.value));
  },

  async listVersions(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowVersionDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const list = await WorkflowVersionRepository.listByWorkflow(id);
    if (!list.ok) return list;
    return ok(list.value.map(toWorkflowVersionDTO));
  },

  /** Autosave: persiste o `definition` no DRAFT corrente. */
  async updateDraft(
    userId: string,
    slug: string,
    id: string,
    input: UpdateWorkflowDraftInput,
  ): Promise<Result<WorkflowVersionDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const draft = await WorkflowVersionRepository.findDraft(id);
    if (!draft.ok) return draft;
    if (!draft.value) return err(workflowVersionNotDraft());

    const parsed = WorkflowDefinitionSchema.safeParse(input.definition);
    if (!parsed.success) {
      return err(
        workflowInvalidDefinition("Definição inválida", parsed.error.issues),
      );
    }
    const updated = await WorkflowVersionRepository.updateDefinition(
      draft.value.id,
      parsed.data,
    );
    if (!updated.ok) return updated;
    await WorkflowRepository.update(id, { updatedById: userId });
    return ok(toWorkflowVersionDTO(updated.value));
  },

  /** Activate: precisa ter trigger configurado. */
  async activate(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const draft = await WorkflowVersionRepository.findDraft(id);
    if (!draft.ok) return draft;
    if (!draft.value) return err(workflowVersionNotDraft());

    const definition = parseDefinition(draft.value.definition);
    if (!definition.trigger.data) {
      return err(
        workflowInvalidDefinition("Configure o trigger antes de ativar"),
      );
    }
    const activated = await WorkflowVersionRepository.activateDraft(
      id,
      draft.value.id,
    );
    if (!activated.ok) return activated;
    const reloaded = await WorkflowRepository.findById(id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(workflowNotFound());
    return ok(toWorkflowDTO(reloaded.value));
  },

  /** Discard: descarta alterações no draft (volta para o ACTIVE). */
  async discard(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowVersionDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const result = await WorkflowVersionRepository.discardDraft(id);
    if (!result.ok) return result;
    return ok(toWorkflowVersionDTO(result.value));
  },

  async listRuns(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<WorkflowRunDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const list = await WorkflowRunRepository.listByWorkflow(id);
    if (!list.ok) return list;
    return ok(list.value.map((run) => toWorkflowRunDTO(run)));
  },

  async getRun(
    userId: string,
    slug: string,
    id: string,
    runId: string,
  ): Promise<Result<WorkflowRunDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;
    const run = await WorkflowRunRepository.findById(runId);
    if (!run.ok) return run;
    if (!run.value || run.value.workflowId !== id) {
      return err(workflowNotFound());
    }
    return ok(toWorkflowRunDTO(run.value));
  },

  /**
   * Disparo manual via UI ("Test" / botão Run). Cria a run, despacha pro
   * runner e retorna a run criada. O runner roda em foreground (await) na
   * MVP — futuramente vira fila.
   */
  async triggerManual(
    userId: string,
    slug: string,
    id: string,
    input: TriggerManualRunInput,
  ): Promise<Result<WorkflowRunDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    // Em test mode usamos o DRAFT (preview); senão, a versão ACTIVE.
    const versionResult = input.test
      ? await WorkflowVersionRepository.findDraft(id)
      : await WorkflowVersionRepository.findActive(id);
    if (!versionResult.ok) return versionResult;
    if (!versionResult.value) return err(workflowVersionNotFound());

    const created = await WorkflowRunRepository.create({
      workflowId: id,
      versionId: versionResult.value.id,
      triggerType: triggerTypeToPrisma("launch-manually"),
      triggerPayload: (input.payload ?? {}) as object,
      startedById: userId,
    });
    if (!created.ok) return created;

    try {
      await runWorkflow({
        runId: created.value.id,
        workspaceId: ws.value,
        actingUserId: userId,
        definition: parseDefinition(versionResult.value.definition),
        triggerType: "launch-manually",
        triggerPayload: input.payload,
        testMode: input.test,
      });
    } catch (cause) {
      return err(
        workflowExecutionFailed("Falha ao executar o workflow", {
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }

    const reloaded = await WorkflowRunRepository.findById(created.value.id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(workflowNotFound());
    return ok(toWorkflowRunDTO(reloaded.value));
  },

  /**
   * Retoma um run pausado em um form. Encontra o step waiting, busca o node
   * correspondente na versão usada pelo run, e chama `resumeWorkflow` com o
   * scope persistido em `run.state`.
   */
  async resumeRun(
    userId: string,
    slug: string,
    id: string,
    runId: string,
    input: ResumeRunInput,
  ): Promise<Result<WorkflowRunDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;
    const existing = await loadInWorkspace(ws.value, id);
    if (!existing.ok) return existing;

    const runFound = await WorkflowRunRepository.findById(runId);
    if (!runFound.ok) return runFound;
    if (!runFound.value || runFound.value.workflowId !== id) {
      return err(workflowNotFound());
    }
    const run = runFound.value;
    if (run.status !== "WAITING" || !run.waitingStepId || !run.state) {
      return err(workflowExecutionFailed("Run não está aguardando input"));
    }
    const waitingStep = run.steps.find((s) => s.id === run.waitingStepId);
    if (!waitingStep) {
      return err(workflowExecutionFailed("Step pausado não encontrado"));
    }

    const versionFound = await WorkflowVersionRepository.findById(run.versionId);
    if (!versionFound.ok) return versionFound;
    if (!versionFound.value) return err(workflowVersionNotFound());

    const definition = parseDefinition(versionFound.value.definition);
    const pausedNode = definition.nodes.find(
      (n) => n.id === waitingStep.nodeId,
    );
    if (!pausedNode || pausedNode.data.type !== "form") {
      return err(workflowExecutionFailed("Node pausado inválido"));
    }
    const outputAlias = pausedNode.data.outputAlias ?? pausedNode.id;

    try {
      await resumeWorkflow({
        runId: run.id,
        workspaceId: ws.value,
        actingUserId: userId,
        definition,
        triggerType: "launch-manually",
        triggerPayload: run.triggerPayload,
        waitingStepId: run.waitingStepId,
        pausedNodeId: pausedNode.id,
        scope: run.state as Record<string, unknown>,
        submission: input.payload,
        outputAlias,
      });
    } catch (cause) {
      return err(
        workflowExecutionFailed("Falha ao retomar o workflow", {
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }

    const reloaded = await WorkflowRunRepository.findById(run.id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(workflowNotFound());
    return ok(toWorkflowRunDTO(reloaded.value));
  },

  /**
   * Disparo pelo endpoint público `/api/workflows/webhook/<token>`. Sem
   * auth — a posse vem do próprio token. Roda contra a versão ACTIVE.
   */
  async triggerWebhook(
    token: string,
    payload: unknown,
  ): Promise<Result<WorkflowRunDTO>> {
    const match = await WorkflowRepository.findActiveByWebhookToken(token);
    if (!match.ok) return match;
    if (!match.value || !match.value.activeVersion) {
      return err(workflowWebhookInvalid());
    }
    const wf = match.value;
    const version = match.value.activeVersion;
    const created = await WorkflowRunRepository.create({
      workflowId: wf.id,
      versionId: version.id,
      triggerType: triggerTypeToPrisma("webhook"),
      triggerPayload: (payload ?? {}) as object,
      startedById: null,
    });
    if (!created.ok) return created;
    try {
      await runWorkflow({
        runId: created.value.id,
        workspaceId: wf.workspaceId,
        actingUserId: wf.createdById,
        definition: parseDefinition(version.definition),
        triggerType: "webhook",
        triggerPayload: payload,
        testMode: false,
      });
    } catch (cause) {
      return err(
        workflowExecutionFailed("Falha ao executar o workflow", {
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
    const reloaded = await WorkflowRunRepository.findById(created.value.id);
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(workflowNotFound());
    return ok(toWorkflowRunDTO(reloaded.value));
  },
};

export { validationError };
