"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { ProposalDTO } from "@/src/schemas/proposal.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-500/15 text-emerald-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "title",
    header: "Título",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Proposta comercial",
  },
  {
    key: "status",
    header: "Status",
    kind: "select",
    defaultValue: "DRAFT",
    options: [
      { value: "DRAFT", label: "Offline" },
      { value: "PUBLISHED", label: "Online" },
    ],
    optionStyles: STATUS_STYLES,
  },
  {
    key: "viewsCount",
    header: "Visualizações",
    kind: "number",
    readonly: true,
  },
  {
    key: "createdById",
    header: "Criado por",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Data de criação", kind: "readonly-date" },
  { key: "updatedAt", header: "Última atualização", kind: "readonly-date" },
];

export function ProposalsTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<ProposalDTO>(
    slug,
    "proposals",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="proposals"
        createTitle="proposta"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar propostas…"
        refetch={refetch}
      />
    </PageShell>
  );
}
