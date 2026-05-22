"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { CompanyDTO } from "@/src/schemas/company.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Name",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Acme Inc",
  },
  { key: "domain", header: "Domain", kind: "link", placeholder: "acme.com" },
  { key: "employees", header: "Employees", kind: "number", placeholder: "120" },
  {
    key: "linkedin",
    header: "LinkedIn",
    kind: "link",
    placeholder: "linkedin.com/company/acme",
  },
  { key: "address", header: "Address", kind: "text" },
  { key: "arr", header: "ARR", kind: "money", placeholder: "250000" },
  { key: "icp", header: "ICP", kind: "boolean" },
  {
    key: "accountOwnerId",
    header: "Account owner",
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

export function CompaniesTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<CompanyDTO>(
    slug,
    "companies",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="companies"
        createTitle="company"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Search companies…"
        refetch={refetch}
      />
    </PageShell>
  );
}
