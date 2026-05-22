"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
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
    header: "Name",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Ada Lovelace",
  },
  {
    key: "emails",
    header: "Emails",
    kind: "tags",
    placeholder: "ada@acme.com, ada@gmail.com",
  },
  {
    key: "phones",
    header: "Phones",
    kind: "tags",
    placeholder: "+55 11 99999-0000",
  },
  { key: "city", header: "City", kind: "text", placeholder: "Recife, PE" },
  {
    key: "jobTitle",
    header: "Job title",
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
    header: "Company",
    kind: "relation",
    relationKind: "companies",
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

export function PeopleTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<PersonDTO>(
    slug,
    "people",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="people"
        createTitle="person"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Search people…"
        refetch={refetch}
      />
    </PageShell>
  );
}
