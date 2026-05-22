"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { NoteDTO } from "@/src/schemas/note.schema";

const LOOKUP_KINDS: LookupKind[] = [
  "companies",
  "people",
  "opportunities",
  "users",
];

const COLUMNS: GridColumn[] = [
  {
    key: "title",
    header: "Title",
    kind: "text",
    primary: true,
    placeholder: "Reunião de kickoff",
  },
  { key: "body", header: "Body", kind: "richtext", placeholder: "Resumo…" },
  {
    key: "companyId",
    header: "Company",
    kind: "relation",
    relationKind: "companies",
    clearable: true,
  },
  {
    key: "personId",
    header: "Person",
    kind: "relation",
    relationKind: "people",
    clearable: true,
  },
  {
    key: "opportunityId",
    header: "Opportunity",
    kind: "relation",
    relationKind: "opportunities",
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

export function NotesTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<NoteDTO>(slug, "notes");
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="notes"
        createTitle="note"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Search notes…"
        refetch={refetch}
      />
    </PageShell>
  );
}
