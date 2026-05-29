"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { WorkflowDTO } from "@/src/schemas/workflow.schema";

const LOOKUP_KINDS: LookupKind[] = [];

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Onboarding de leads",
  },
  {
    key: "status",
    header: "Status",
    kind: "text",
    readonly: true,
  },
  {
    key: "description",
    header: "Descrição",
    kind: "text",
    placeholder: "Disparado quando uma nova pessoa é criada…",
  },
  { key: "lastRunAt", header: "Última execução", kind: "readonly-date" },
  { key: "createdAt", header: "Criado em", kind: "readonly-date" },
  { key: "updatedAt", header: "Atualizado em", kind: "readonly-date" },
];

export function WorkflowsTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<WorkflowDTO>(
    slug,
    "workflows",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="workflows"
        createTitle="workflow"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar workflows…"
        refetch={refetch}
      />
    </PageShell>
  );
}
