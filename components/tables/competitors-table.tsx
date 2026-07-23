"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { CompetitorDTO } from "@/src/schemas/competitor.schema";
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
} from "@/src/schemas/social-connection.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const PLATFORM_OPTIONS = SOCIAL_PLATFORMS.map((p) => ({
  value: p,
  label: SOCIAL_PLATFORM_LABELS[p],
}));

const COLUMNS: GridColumn[] = [
  {
    key: "handle",
    header: "Perfil",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "@concorrente",
  },
  {
    key: "platform",
    header: "Rede",
    kind: "select",
    defaultValue: "INSTAGRAM",
    options: PLATFORM_OPTIONS,
  },
  {
    key: "profileUrl",
    header: "Link do perfil",
    kind: "link",
    placeholder: "instagram.com/concorrente",
  },
  {
    key: "followersCount",
    header: "Seguidores",
    kind: "number",
    placeholder: "0",
  },
  { key: "notes", header: "Observações", kind: "text" },
  {
    key: "createdById",
    header: "Criado por",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Criado em", kind: "readonly-date" },
];

export function CompetitorsTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<CompetitorDTO>(
    slug,
    "competitors",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="competitors"
        createTitle="concorrente"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar concorrentes…"
        refetch={refetch}
      />
    </PageShell>
  );
}
