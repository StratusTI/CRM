"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { RecordTimeline } from "@/components/tables/record-timeline";
import {
  customFieldColumns,
  useCustomFields,
} from "@/src/hooks/use-custom-fields";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { CompanyDTO } from "@/src/schemas/company.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const COLUMNS: GridColumn[] = [
  {
    key: "cnpj",
    header: "CNPJ",
    kind: "cnpj",
    primary: true,
    placeholder: "00.000.000/0000-00",
  },
  {
    key: "name",
    header: "Nome",
    kind: "text",
    placeholder: "Acme Inc",
  },
  { key: "domain", header: "Domínio", kind: "link", placeholder: "acme.com" },
  {
    key: "employees",
    header: "Funcionários",
    kind: "number",
    placeholder: "120",
  },
  {
    key: "linkedin",
    header: "LinkedIn",
    kind: "link",
    placeholder: "linkedin.com/company/acme",
  },
  { key: "address", header: "Endereço (CEP)", kind: "address" },
  { key: "arr", header: "RRA", kind: "money", placeholder: "250000" },
  { key: "icp", header: "PCI", kind: "boolean" },
  {
    key: "accountOwnerId",
    header: "Responsável pela conta",
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

export function CompaniesTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<CompanyDTO>(
    slug,
    "companies",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  const { fields } = useCustomFields(slug, "COMPANY");
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
        resource="companies"
        createTitle="empresa"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar empresas…"
        refetch={refetch}
        renderRecordExtra={(record) => (
          <RecordTimeline
            slug={slug}
            entity="company"
            recordId={record.id}
            userMap={lookups.maps.users}
          />
        )}
      />
    </PageShell>
  );
}
