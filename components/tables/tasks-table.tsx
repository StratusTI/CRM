"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import { TASK_STATUSES, type TaskDTO } from "@/src/schemas/task.schema";

const LOOKUP_KINDS: LookupKind[] = [
  "companies",
  "people",
  "opportunities",
  "users",
];

const STATUS_STYLES: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "bg-slate-500/15 text-slate-600",
  IN_PROGRESS: "bg-blue-500/15 text-blue-600",
  DONE: "bg-emerald-500/15 text-emerald-600",
};

const STATUS_LABEL: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
};

const COLUMNS: GridColumn[] = [
  {
    key: "title",
    header: "Título",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Ligar para o cliente",
  },
  {
    key: "status",
    header: "Status",
    kind: "select",
    defaultValue: "TODO",
    options: TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
    optionStyles: STATUS_STYLES,
  },
  { key: "dueDate", header: "Prazo", kind: "date" },
  {
    key: "assigneeId",
    header: "Responsável",
    kind: "relation",
    relationKind: "users",
    clearable: true,
  },
  {
    key: "companyId",
    header: "Empresa",
    kind: "relation",
    relationKind: "companies",
    clearable: true,
  },
  {
    key: "personId",
    header: "Pessoa",
    kind: "relation",
    relationKind: "people",
    clearable: true,
  },
  {
    key: "opportunityId",
    header: "Oportunidade",
    kind: "relation",
    relationKind: "opportunities",
    clearable: true,
  },
  {
    key: "body",
    header: "Conteúdo",
    kind: "richtext",
    placeholder: "Detalhes…",
  },
  {
    key: "createdById",
    header: "Criado por",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  {
    key: "updatedById",
    header: "Atualizado por",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Criado em", kind: "readonly-date" },
  { key: "updatedAt", header: "Última atualização", kind: "readonly-date" },
];

export function TasksTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<TaskDTO>(slug, "tasks");
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="tasks"
        createTitle="tarefa"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar tarefas…"
        refetch={refetch}
      />
    </PageShell>
  );
}
