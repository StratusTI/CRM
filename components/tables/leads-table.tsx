"use client";

import { DataTable } from "@/components/data-table";
import { LeadConvert } from "@/components/tables/lead-convert";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import { LEAD_STATUSES, type LeadDTO } from "@/src/schemas/lead.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const STATUS_STYLES: Record<(typeof LEAD_STATUSES)[number], string> = {
  NEW: "bg-slate-500/15 text-slate-600",
  WORKING: "bg-blue-500/15 text-blue-600",
  QUALIFIED: "bg-emerald-500/15 text-emerald-600",
  UNQUALIFIED: "bg-rose-500/15 text-rose-600",
  CONVERTED: "bg-violet-500/15 text-violet-600",
};

const STATUS_LABELS: Record<(typeof LEAD_STATUSES)[number], string> = {
  NEW: "Novo",
  WORKING: "Em contato",
  QUALIFIED: "Qualificado",
  UNQUALIFIED: "Desqualificado",
  CONVERTED: "Convertido",
};

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Maria Silva",
  },
  { key: "emails", header: "E-mails", kind: "tags", placeholder: "maria@x.com" },
  { key: "phones", header: "Telefones", kind: "tags" },
  { key: "company", header: "Empresa", kind: "text" },
  { key: "jobTitle", header: "Cargo", kind: "text" },
  { key: "source", header: "Origem", kind: "text", placeholder: "WhatsApp" },
  {
    key: "status",
    header: "Status",
    kind: "select",
    defaultValue: "NEW",
    options: LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
    optionStyles: STATUS_STYLES,
  },
  { key: "score", header: "Score", kind: "number", readonly: true },
  {
    key: "ownerId",
    header: "Responsável",
    kind: "relation",
    relationKind: "users",
    clearable: true,
  },
  { key: "createdAt", header: "Criado em", kind: "readonly-date" },
];

export function LeadsTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<LeadDTO>(slug, "leads");
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="leads"
        createTitle="lead"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar leads…"
        refetch={refetch}
        renderRecordExtra={(record) => (
          <LeadConvert lead={record} slug={slug} onConverted={refetch} />
        )}
      />
    </PageShell>
  );
}
