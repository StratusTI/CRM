"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import {
  OPPORTUNITY_STAGES,
  type OpportunityDTO,
} from "@/src/schemas/opportunity.schema";

const LOOKUP_KINDS: LookupKind[] = ["companies", "people", "users"];

const STAGE_STYLES: Record<(typeof OPPORTUNITY_STAGES)[number], string> = {
  NEW: "bg-slate-500/15 text-slate-600",
  QUALIFIED: "bg-blue-500/15 text-blue-600",
  MEETING: "bg-indigo-500/15 text-indigo-600",
  PROPOSAL: "bg-amber-500/15 text-amber-600",
  NEGOTIATION: "bg-orange-500/15 text-orange-600",
  WON: "bg-emerald-500/15 text-emerald-600",
  LOST: "bg-rose-500/15 text-rose-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Name",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Renovação anual — Acme",
  },
  { key: "amount", header: "Amount", kind: "money", placeholder: "50000" },
  {
    key: "stage",
    header: "Stage",
    kind: "select",
    defaultValue: "NEW",
    options: OPPORTUNITY_STAGES.map((s) => ({ value: s, label: s })),
    optionStyles: STAGE_STYLES,
  },
  { key: "closeDate", header: "Close date", kind: "date" },
  {
    key: "companyId",
    header: "Company",
    kind: "relation",
    relationKind: "companies",
    clearable: true,
  },
  {
    key: "pointOfContactId",
    header: "Point of contact",
    kind: "relation",
    relationKind: "people",
    clearable: true,
  },
  {
    key: "ownerId",
    header: "Owner",
    kind: "relation",
    relationKind: "users",
    clearable: true,
  },
  {
    key: "createdById",
    header: "Created by",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  {
    key: "updatedById",
    header: "Updated by",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Created", kind: "readonly-date" },
  { key: "updatedAt", header: "Last update", kind: "readonly-date" },
];

export function OpportunitiesTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<OpportunityDTO>(
    slug,
    "opportunities",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="opportunities"
        createTitle="opportunity"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Search opportunities…"
        refetch={refetch}
      />
    </PageShell>
  );
}
