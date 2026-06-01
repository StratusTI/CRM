import { CompanyService } from "@/src/services/company.service";
import { DashboardService } from "@/src/services/dashboard.service";
import { NoteService } from "@/src/services/note.service";
import { OpportunityService } from "@/src/services/opportunity.service";
import { PersonService } from "@/src/services/person.service";
import { TaskService } from "@/src/services/task.service";
import type { ToolDef } from "./client";

export type ToolContext = { userId: string; slug: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const NOTE_PREVIEW = 280;

const limitParam = {
  type: "object",
  properties: {
    limit: {
      type: "number",
      description: `Máximo de itens a retornar (default ${DEFAULT_LIMIT}).`,
    },
  },
  additionalProperties: false,
} as const;

/** Tools de LEITURA expostas ao modelo. Nenhuma escreve no banco. */
export const AI_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_workspace_overview",
      description:
        "Resumo agregado do workspace: contagens de empresas, pessoas, oportunidades, tarefas e notas; pipeline de oportunidades por estágio (com soma de valores) e tarefas por status. Use isto primeiro para perguntas gerais ou de totais.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_companies",
      description:
        "Lista as empresas (clientes) do workspace com campos principais (nome, domínio, nº de funcionários, ARR, ICP).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_people",
      description:
        "Lista os contatos/pessoas do workspace (nome, emails, cargo, cidade, empresa).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_opportunities",
      description:
        "Lista as oportunidades (negócios) do workspace com valor, estágio e data de fechamento.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description:
        "Lista as tarefas do workspace com status, prazo e responsável.",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description:
        "Lista as notas/anotações do workspace (título e prévia do conteúdo).",
      parameters: limitParam,
    },
  },
  {
    type: "function",
    function: {
      name: "list_dashboards",
      description: "Lista os dashboards do workspace (título).",
      parameters: limitParam,
    },
  },
];

function parseLimit(rawArgs: string): number {
  try {
    const parsed = JSON.parse(rawArgs || "{}") as { limit?: unknown };
    const n = typeof parsed.limit === "number" ? parsed.limit : DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
  } catch {
    return DEFAULT_LIMIT;
  }
}

/**
 * Executa uma tool e devolve o resultado como string JSON (pronta para virar
 * a mensagem `role: "tool"`). Tudo escopado por (userId, slug) via os services
 * existentes, que já filtram soft-delete e checam membership.
 */
export async function executeTool(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<string> {
  const { userId, slug } = ctx;
  const limit = parseLimit(rawArgs);

  switch (name) {
    case "get_workspace_overview":
      return JSON.stringify(await buildOverview(ctx));

    case "list_companies": {
      const r = await CompanyService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((c) => ({
          id: c.id,
          name: c.name,
          domain: c.domain,
          employees: c.employees,
          arr: c.arr,
          icp: c.icp,
        })),
      );
    }

    case "list_people": {
      const r = await PersonService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((p) => ({
          id: p.id,
          name: p.name,
          emails: p.emails,
          jobTitle: p.jobTitle,
          city: p.city,
          companyId: p.companyId,
        })),
      );
    }

    case "list_opportunities": {
      const r = await OpportunityService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((o) => ({
          id: o.id,
          name: o.name,
          amount: o.amount,
          stage: o.stage,
          closeDate: o.closeDate,
          companyId: o.companyId,
        })),
      );
    }

    case "list_tasks": {
      const r = await TaskService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
          assigneeId: t.assigneeId,
        })),
      );
    }

    case "list_notes": {
      const r = await NoteService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((n) => ({
          id: n.id,
          title: n.title,
          preview: n.body?.slice(0, NOTE_PREVIEW) ?? null,
        })),
      );
    }

    case "list_dashboards": {
      const r = await DashboardService.list(userId, slug);
      if (!r.ok) return toolError(r.error.message);
      return JSON.stringify(
        r.value.slice(0, limit).map((d) => ({ id: d.id, title: d.title })),
      );
    }

    default:
      return toolError(`Tool desconhecida: ${name}`);
  }
}

async function buildOverview(ctx: ToolContext): Promise<unknown> {
  const { userId, slug } = ctx;
  const [companies, people, opportunities, tasks, notes] = await Promise.all([
    CompanyService.list(userId, slug),
    PersonService.list(userId, slug),
    OpportunityService.list(userId, slug),
    TaskService.list(userId, slug),
    NoteService.list(userId, slug),
  ]);

  const opps = opportunities.ok ? opportunities.value : [];
  const pipelineByStage: Record<string, { count: number; amount: number }> = {};
  for (const o of opps) {
    const bucket = pipelineByStage[o.stage] ?? { count: 0, amount: 0 };
    bucket.count += 1;
    bucket.amount += o.amount ?? 0;
    pipelineByStage[o.stage] = bucket;
  }

  const taskList = tasks.ok ? tasks.value : [];
  const tasksByStatus: Record<string, number> = {};
  for (const t of taskList) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
  }

  return {
    counts: {
      companies: companies.ok ? companies.value.length : 0,
      people: people.ok ? people.value.length : 0,
      opportunities: opps.length,
      tasks: taskList.length,
      notes: notes.ok ? notes.value.length : 0,
    },
    pipelineByStage,
    tasksByStatus,
  };
}

function toolError(message: string): string {
  return JSON.stringify({ error: message });
}
