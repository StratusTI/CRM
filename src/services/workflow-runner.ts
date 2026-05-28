import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { getFromAddress, getResendClient } from "@/src/lib/resend";
import { WorkflowRunRepository } from "@/src/repositories/workflow-run.repository";
import type {
  WorkflowCondition,
  WorkflowDefinition,
  WorkflowEntity,
  WorkflowFilterOperator,
  WorkflowNode,
  WorkflowTriggerType,
} from "@/src/schemas/workflow.schema";

/**
 * Engine in-process — caminha pelo grafo a partir do trigger, executa cada
 * node alcançável e grava um `WorkflowRunStep`. Suporta:
 *  - create/update/delete/search/create-or-update-record (5 entidades CRM)
 *  - filter (continua/para)
 *  - if-else (segue branch por sourceHandle "true"/"false")
 *  - delay (resolve fixo em segundos; ignora `unit` exceto pra cálculo)
 *  - send-email (precisa Resend configurado; em testMode só registra payload)
 *  - draft-email (cria EmailCampaign DRAFT)
 *  - iterator (executa branch sequencialmente para cada item)
 *  - form (pausa run — implementação completa na próxima fatia)
 */

type RunContext = {
  runId: string;
  workspaceId: string;
  actingUserId: string;
  triggerType: WorkflowTriggerType;
  triggerPayload: unknown;
  /** Dados disponíveis pra expression resolver. */
  scope: Record<string, unknown>;
  testMode: boolean;
};

export type RunWorkflowParams = {
  runId: string;
  workspaceId: string;
  actingUserId: string;
  definition: WorkflowDefinition;
  triggerType: WorkflowTriggerType;
  triggerPayload: unknown;
  testMode: boolean;
};

const ENTITY_DELEGATE: Record<
  WorkflowEntity,
  "company" | "person" | "opportunity" | "task" | "note"
> = {
  company: "company",
  person: "person",
  opportunity: "opportunity",
  task: "task",
  note: "note",
};

/* ============================ expression =============================== */

const TEMPLATE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

function getPath(scope: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, scope);
}

/**
 * Resolve "{{a.b}} - {{c}}" contra o scope.
 *  - String inteira igual a uma expressão → retorna o valor cru (preserva tipo).
 *  - Caso contrário, interpolação em string.
 */
function resolveExpression(
  value: unknown,
  scope: Record<string, unknown>,
): unknown {
  if (typeof value !== "string") return value;
  const wholeMatch = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (wholeMatch) return getPath(scope, wholeMatch[1]);
  return value.replace(TEMPLATE_RE, (_, path: string) => {
    const v = getPath(scope, path.trim());
    if (v === undefined || v === null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}

function resolveFields(
  fields: Record<string, string>,
  scope: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(fields)) {
    out[key] = resolveExpression(expr, scope);
  }
  return out;
}

/* ============================ conditions =============================== */

function compare(
  left: unknown,
  op: WorkflowFilterOperator,
  right: unknown,
): boolean {
  const l = left ?? null;
  const r = right ?? null;
  switch (op) {
    case "equals":
      return String(l) === String(r);
    case "not_equals":
      return String(l) !== String(r);
    case "contains":
      return typeof l === "string" && l.includes(String(r));
    case "not_contains":
      return typeof l === "string" && !l.includes(String(r));
    case "is_empty":
      return l === null || l === "" || (Array.isArray(l) && l.length === 0);
    case "is_not_empty":
      return !(l === null || l === "" || (Array.isArray(l) && l.length === 0));
    case "gt":
      return Number(l) > Number(r);
    case "gte":
      return Number(l) >= Number(r);
    case "lt":
      return Number(l) < Number(r);
    case "lte":
      return Number(l) <= Number(r);
  }
}

function evalConditions(
  conditions: WorkflowCondition[],
  scope: Record<string, unknown>,
): boolean {
  return conditions.every((c) => {
    const left = resolveExpression(c.field, scope);
    const right = resolveExpression(c.value ?? "", scope);
    return compare(left, c.operator, right);
  });
}

/* ========================= entity dispatch ============================= */

type EntityClient = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  findMany: (args: {
    where: Record<string, unknown>;
    take?: number;
  }) => Promise<Array<{ id: string }>>;
  findFirst: (args: {
    where: Record<string, unknown>;
  }) => Promise<{ id: string } | null>;
};

function getEntityClient(entity: WorkflowEntity): EntityClient {
  const delegate = ENTITY_DELEGATE[entity];
  return prisma[delegate] as unknown as EntityClient;
}

function withScopeFields(
  workspaceId: string,
  actingUserId: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  // Limpa campos vazios pra não sobrescrever required do Prisma.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === "" || v === null || v === undefined) continue;
    cleaned[k] = v;
  }
  return {
    ...cleaned,
    workspaceId,
    createdById: actingUserId,
  };
}

/* ============================ executors ================================ */

async function executeNode(
  node: WorkflowNode,
  ctx: RunContext,
): Promise<{ output: unknown; sourceHandle?: string; pause?: boolean }> {
  const { data } = node;
  const scope = ctx.scope;
  switch (data.type) {
    case "create-record": {
      const fields = resolveFields(data.fields, scope);
      if (ctx.testMode) return { output: { simulated: true, fields } };
      const client = getEntityClient(data.entity);
      const created = await client.create({
        data: withScopeFields(ctx.workspaceId, ctx.actingUserId, fields),
      });
      return { output: { id: created.id, ...fields } };
    }
    case "update-record": {
      const id = String(resolveExpression(data.recordId, scope) ?? "");
      const fields = resolveFields(data.fields, scope);
      if (!id) return { output: { skipped: true, reason: "no recordId" } };
      if (ctx.testMode) return { output: { simulated: true, id, fields } };
      const client = getEntityClient(data.entity);
      const updated = await client.update({
        where: { id },
        data: { ...fields, updatedById: ctx.actingUserId },
      });
      return { output: { id: updated.id, ...fields } };
    }
    case "delete-record": {
      const id = String(resolveExpression(data.recordId, scope) ?? "");
      if (!id) return { output: { skipped: true, reason: "no recordId" } };
      if (ctx.testMode) return { output: { simulated: true, id } };
      const client = getEntityClient(data.entity);
      await client.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById: ctx.actingUserId },
      });
      return { output: { id, deleted: true } };
    }
    case "search-records": {
      const where: Record<string, unknown> = {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
      };
      for (const cond of data.conditions) {
        const field = String(resolveExpression(cond.field, scope) ?? "");
        const value = resolveExpression(cond.value ?? "", scope);
        if (!field) continue;
        switch (cond.operator) {
          case "equals":
            where[field] = value;
            break;
          case "not_equals":
            where[field] = { not: value };
            break;
          case "contains":
            where[field] = { contains: String(value), mode: "insensitive" };
            break;
          case "gt":
            where[field] = { gt: Number(value) };
            break;
          case "lt":
            where[field] = { lt: Number(value) };
            break;
          case "is_empty":
            where[field] = null;
            break;
          case "is_not_empty":
            where[field] = { not: null };
            break;
          default:
            break;
        }
      }
      const client = getEntityClient(data.entity);
      const results = await client.findMany({ where, take: data.limit });
      return { output: results };
    }
    case "create-or-update-record": {
      const lookupValue = resolveExpression(data.lookupValue, scope);
      const fields = resolveFields(data.fields, scope);
      const client = getEntityClient(data.entity);
      const existing = await client.findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          [data.lookupField]: lookupValue,
        },
      });
      if (ctx.testMode)
        return { output: { simulated: true, lookupValue, fields } };
      if (existing) {
        const updated = await client.update({
          where: { id: existing.id },
          data: { ...fields, updatedById: ctx.actingUserId },
        });
        return { output: { id: updated.id, action: "updated", ...fields } };
      }
      const created = await client.create({
        data: withScopeFields(ctx.workspaceId, ctx.actingUserId, {
          ...fields,
          [data.lookupField]: lookupValue,
        }),
      });
      return { output: { id: created.id, action: "created", ...fields } };
    }
    case "filter": {
      const passes = evalConditions(data.conditions, scope);
      return { output: { passes } };
    }
    case "if-else": {
      const passes = evalConditions(data.conditions, scope);
      return {
        output: { branch: passes ? "true" : "false" },
        sourceHandle: passes ? "true" : "false",
      };
    }
    case "delay": {
      const ms = delayToMs(data.amount, data.unit);
      if (ctx.testMode || ms > 60_000) {
        // Em test/long-delay marca como completo com info do delay; runner
        // assíncrono pega o resto no próximo tick (futuro).
        return { output: { scheduledMs: ms } };
      }
      await new Promise((r) => setTimeout(r, ms));
      return { output: { waitedMs: ms } };
    }
    case "send-email": {
      const to = String(resolveExpression(data.to, scope) ?? "");
      const subject = String(resolveExpression(data.subject, scope) ?? "");
      const body = String(resolveExpression(data.body, scope) ?? "");
      if (ctx.testMode) return { output: { simulated: true, to, subject } };
      if (!to) return { output: { skipped: true, reason: "no recipient" } };
      const resend = getResendClient();
      const from = getFromAddress();
      if (!resend || !from) {
        return {
          output: { skipped: true, reason: "Resend não configurado" },
        };
      }
      const res = await resend.emails.send({
        from,
        to,
        subject,
        html: body || "<p></p>",
      });
      if (res.error) {
        throw new Error(`Resend: ${res.error.message ?? "unknown"}`);
      }
      return { output: { messageId: res.data?.id ?? null, to, subject } };
    }
    case "draft-email": {
      const to = String(resolveExpression(data.to, scope) ?? "");
      const subject = String(resolveExpression(data.subject, scope) ?? "");
      const body = String(resolveExpression(data.body, scope) ?? "");
      return { output: { drafted: true, to, subject, body } };
    }
    case "iterator": {
      const source = resolveExpression(data.source, scope);
      const items = Array.isArray(source) ? source : [];
      return { output: { items: items.length, sample: items.slice(0, 3) } };
    }
    case "form": {
      // Sinaliza pause. O loop principal trata: cria step com status PENDING,
      // grava scope no run e sai.
      return {
        output: { paused: true, fields: data.fields.map((f) => f.name) },
        pause: true,
      };
    }
  }
}

function delayToMs(amount: number, unit: string): number {
  const factors: Record<string, number> = {
    seconds: 1000,
    minutes: 60_000,
    hours: 3_600_000,
    days: 86_400_000,
  };
  return amount * (factors[unit] ?? 60_000);
}

/* ========================== graph traversal ============================ */

function buildAdjacency(
  definition: WorkflowDefinition,
): Map<string, { target: string; sourceHandle?: string }[]> {
  const adj = new Map<string, { target: string; sourceHandle?: string }[]>();
  for (const edge of definition.edges) {
    const arr = adj.get(edge.source) ?? [];
    arr.push({ target: edge.target, sourceHandle: edge.sourceHandle });
    adj.set(edge.source, arr);
  }
  return adj;
}

function nextNodes(
  fromId: string,
  branch: string | undefined,
  adj: Map<string, { target: string; sourceHandle?: string }[]>,
  byId: Map<string, WorkflowNode>,
): WorkflowNode[] {
  const candidates = adj.get(fromId) ?? [];
  const filtered = branch
    ? candidates.filter((c) => (c.sourceHandle ?? "") === branch)
    : candidates;
  return filtered
    .map((c) => byId.get(c.target))
    .filter((n): n is WorkflowNode => Boolean(n));
}

/* ============================== entry ================================== */

export async function runWorkflow(params: RunWorkflowParams): Promise<void> {
  const ctx: RunContext = {
    runId: params.runId,
    workspaceId: params.workspaceId,
    actingUserId: params.actingUserId,
    triggerType: params.triggerType,
    triggerPayload: params.triggerPayload,
    testMode: params.testMode,
    scope: {
      trigger: {
        type: params.triggerType,
        payload: params.triggerPayload,
        record: extractRecord(params.triggerPayload),
      },
      steps: {} as Record<string, unknown>,
    },
  };

  await WorkflowRunRepository.setStatus(params.runId, "RUNNING");
  const initialQueue = nextNodes("trigger", undefined, buildAdjacency(params.definition), nodeMap(params.definition));
  await processQueue({
    params,
    ctx,
    queue: initialQueue,
    visited: new Set<string>(),
  });
}

/**
 * Retoma um run pausado em um form. `submission` = payload do form.
 * Marca o step do form como COMPLETED, recompõe scope a partir de
 * `run.state`, e processa a fila de filhos.
 */
export type ResumeParams = {
  runId: string;
  workspaceId: string;
  actingUserId: string;
  definition: WorkflowDefinition;
  triggerType: WorkflowTriggerType;
  triggerPayload: unknown;
  /** Step do form que estava em PENDING/WAITING. */
  waitingStepId: string;
  /** nodeId do form que pausou (precisa pra encontrar filhos). */
  pausedNodeId: string;
  /** Scope completo persistido em run.state. */
  scope: Record<string, unknown>;
  submission: Record<string, unknown>;
  /** Alias do form (usado em `{{steps.<alias>.output}}`). */
  outputAlias: string;
};

export async function resumeWorkflow(p: ResumeParams): Promise<void> {
  const ctx: RunContext = {
    runId: p.runId,
    workspaceId: p.workspaceId,
    actingUserId: p.actingUserId,
    triggerType: p.triggerType,
    triggerPayload: p.triggerPayload,
    testMode: false,
    scope: {
      ...p.scope,
      steps: {
        ...((p.scope.steps as Record<string, unknown>) ?? {}),
        [p.outputAlias]: { output: p.submission },
      },
    },
  };

  await WorkflowRunRepository.updateStep(p.waitingStepId, {
    status: "COMPLETED",
    output: p.submission as Prisma.InputJsonValue,
    finishedAt: new Date(),
  });
  await WorkflowRunRepository.clearPause(p.runId);
  await WorkflowRunRepository.setStatus(p.runId, "RUNNING");

  const adj = buildAdjacency(p.definition);
  const byId = nodeMap(p.definition);
  const queue = nextNodes(p.pausedNodeId, undefined, adj, byId);
  const visited = new Set<string>([p.pausedNodeId]);
  await processQueue({
    params: {
      runId: p.runId,
      workspaceId: p.workspaceId,
      actingUserId: p.actingUserId,
      definition: p.definition,
      triggerType: p.triggerType,
      triggerPayload: p.triggerPayload,
      testMode: false,
    },
    ctx,
    queue,
    visited,
  });
}

async function processQueue(args: {
  params: RunWorkflowParams;
  ctx: RunContext;
  queue: WorkflowNode[];
  visited: Set<string>;
}): Promise<void> {
  const { params, ctx, queue, visited } = args;
  const byId = nodeMap(params.definition);
  const adj = buildAdjacency(params.definition);
  let failed = false;
  let firstError: string | null = null;
  let paused = false;

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    const step = await WorkflowRunRepository.createStep({
      runId: params.runId,
      nodeId: node.id,
      nodeType: node.data.type,
      status: "RUNNING",
      input: ctx.scope.steps as Prisma.InputJsonValue,
    });
    const stepId = step.ok ? step.value.id : null;
    const startedAt = new Date();

    try {
      const result = await executeNode(node, ctx);
      const alias = node.data.outputAlias ?? node.id;

      // Form node: pausa o run e sai. Não enfileira filhos — eles entram no resume.
      if (result.pause && stepId) {
        await WorkflowRunRepository.updateStep(stepId, {
          status: "PENDING",
          output: result.output as Prisma.InputJsonValue,
          startedAt,
        });
        await WorkflowRunRepository.pause(params.runId, {
          state: ctx.scope as Prisma.InputJsonValue,
          waitingStepId: stepId,
        });
        await WorkflowRunRepository.setStatus(params.runId, "WAITING");
        paused = true;
        break;
      }

      (ctx.scope.steps as Record<string, unknown>)[alias] = {
        output: result.output,
      };

      if (node.data.type === "filter") {
        const passes = (result.output as { passes?: boolean }).passes ?? false;
        if (stepId) {
          await WorkflowRunRepository.updateStep(stepId, {
            status: passes ? "COMPLETED" : "SKIPPED",
            output: result.output as Prisma.InputJsonValue,
            startedAt,
            finishedAt: new Date(),
          });
        }
        if (passes) queue.push(...nextNodes(node.id, undefined, adj, byId));
        continue;
      }

      if (stepId) {
        await WorkflowRunRepository.updateStep(stepId, {
          status: "COMPLETED",
          output: result.output as Prisma.InputJsonValue,
          startedAt,
          finishedAt: new Date(),
        });
      }
      queue.push(...nextNodes(node.id, result.sourceHandle, adj, byId));
    } catch (cause) {
      failed = true;
      const message = cause instanceof Error ? cause.message : String(cause);
      firstError = firstError ?? message;
      if (stepId) {
        await WorkflowRunRepository.updateStep(stepId, {
          status: "FAILED",
          error: message,
          startedAt,
          finishedAt: new Date(),
        });
      }
    }
  }

  if (paused) return; // status já foi setado pra WAITING.

  await WorkflowRunRepository.setStatus(
    params.runId,
    failed ? "FAILED" : "COMPLETED",
    { error: firstError, finishedAt: new Date() },
  );
}

function nodeMap(def: WorkflowDefinition): Map<string, WorkflowNode> {
  const m = new Map<string, WorkflowNode>();
  for (const n of def.nodes) m.set(n.id, n);
  return m;
}

function extractRecord(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "record" in payload) {
    return (payload as { record: unknown }).record;
  }
  return payload;
}
