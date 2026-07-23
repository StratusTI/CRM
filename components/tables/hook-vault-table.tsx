"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { HookVaultItemDTO } from "@/src/schemas/hook-vault.schema";
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
    key: "text",
    header: "Hook",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Você não vai acreditar no que aconteceu…",
  },
  {
    key: "platform",
    header: "Rede",
    kind: "select",
    options: PLATFORM_OPTIONS,
    clearable: true,
    placeholder: "Todas",
  },
  {
    key: "usageCount",
    header: "Qtd. de uso",
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

export function HookVaultTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<HookVaultItemDTO>(
    slug,
    "hook-vault",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="hook-vault"
        createTitle="hook"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar hooks…"
        refetch={refetch}
      />
    </PageShell>
  );
}
