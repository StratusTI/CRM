"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import {
  customFieldColumns,
  useCustomFields,
} from "@/src/hooks/use-custom-fields";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { PersonDTO } from "@/src/schemas/person.schema";

const LOOKUP_KINDS: LookupKind[] = ["companies", "users"];

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Ada Lovelace",
  },
  {
    key: "emails",
    header: "E-mails",
    kind: "tags",
    placeholder: "ada@acme.com, ada@gmail.com",
  },
  {
    key: "phones",
    header: "Telefones",
    kind: "tags",
    placeholder: "+55 11 99999-0000",
  },
  { key: "city", header: "Cidade", kind: "text", placeholder: "Recife, PE" },
  {
    key: "jobTitle",
    header: "Cargo",
    kind: "text",
    placeholder: "Head of Sales",
  },
  {
    key: "linkedin",
    header: "LinkedIn",
    kind: "link",
    placeholder: "linkedin.com/in/adalovelace",
  },
  {
    key: "companyId",
    header: "Empresa",
    kind: "relation",
    relationKind: "companies",
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

export function PeopleTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<PersonDTO>(
    slug,
    "people",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  const { fields } = useCustomFields(slug, "PERSON");
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
        resource="people"
        createTitle="pessoa"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar pessoas…"
        refetch={refetch}
      />
    </PageShell>
  );
}
