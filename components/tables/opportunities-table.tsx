"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { OpportunityLineItems } from "@/components/tables/opportunity-line-items";
import {
  customFieldColumns,
  useCustomFields,
} from "@/src/hooks/use-custom-fields";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { OpportunityDTO } from "@/src/schemas/opportunity.schema";

const LOOKUP_KINDS: LookupKind[] = [
  "companies",
  "people",
  "users",
  "pipelines",
  "stages",
  "products",
];

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Renovação anual — Acme",
  },
  { key: "amount", header: "Valor", kind: "money", placeholder: "50000" },
  {
    key: "pipelineId",
    header: "Funil",
    kind: "relation",
    relationKind: "pipelines",
  },
  {
    key: "stageId",
    header: "Etapa",
    kind: "relation",
    relationKind: "stages",
  },
  { key: "closeDate", header: "Data de fechamento", kind: "date" },
  {
    key: "companyId",
    header: "Empresa",
    kind: "relation",
    relationKind: "companies",
    clearable: true,
  },
  {
    key: "pointOfContactId",
    header: "Ponto de contato",
    kind: "relation",
    relationKind: "people",
    clearable: true,
  },
  {
    key: "ownerId",
    header: "Responsável",
    kind: "relation",
    relationKind: "users",
    clearable: true,
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

export function OpportunitiesTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<OpportunityDTO>(
    slug,
    "opportunities",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  const { fields } = useCustomFields(slug, "OPPORTUNITY");
  const columns = useMemo(
    () => [...COLUMNS, ...customFieldColumns(fields)],
    [fields],
  );

  return (
    <PageShell>
      <DataTable
        columns={columns}
        data={items}
        slug={slug}
        resource="opportunities"
        createTitle="oportunidade"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar oportunidades…"
        refetch={refetch}
        renderRecordExtra={(record) => (
          <OpportunityLineItems
            slug={slug}
            opportunityId={record.id}
            productOptions={lookups.options.products}
            onChanged={refetch}
          />
        )}
      />
    </PageShell>
  );
}
