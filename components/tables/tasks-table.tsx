"use client";

import { Calendar01Icon, TaskDone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { cn } from "@/lib/utils";
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

function ViewToggle({ slug }: { slug: string }) {
  const pathname = usePathname();
  const isCalendar = pathname.endsWith("/calendar");
  const base = `/${slug}/tasks`;

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background p-0.5">
      <Link
        href={base}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          !isCalendar
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <HugeiconsIcon icon={TaskDone01Icon} className="size-3.5" />
        Lista
      </Link>
      <Link
        href={`${base}/calendar`}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          isCalendar
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
        Calendário
      </Link>
    </div>
  );
}

export function TasksTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<TaskDTO>(slug, "tasks");
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell action={<ViewToggle slug={slug} />}>
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
