"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { DashboardDTO } from "@/src/schemas/dashboard.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const COLUMNS: GridColumn[] = [
  {
    key: "title",
    header: "Title",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Visão de vendas",
  },
  {
    key: "createdById",
    header: "Created by",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Creation date", kind: "readonly-date" },
  { key: "updatedAt", header: "Last update", kind: "readonly-date" },
  { key: "deletedAt", header: "Deleted at", kind: "readonly-date" },
  {
    key: "pageLayoutId",
    header: "Page layout id",
    kind: "text",
    placeholder: "layout_…",
  },
  {
    key: "updatedById",
    header: "Updated by",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
];

export function DashboardsTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<DashboardDTO>(
    slug,
    "dashboards",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="dashboards"
        createTitle="dashboard"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Search dashboards…"
        refetch={refetch}
      />
    </PageShell>
  );
}
