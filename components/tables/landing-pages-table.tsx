"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table";
import { LandingPageMetricsPanel } from "@/components/landing-pages/landing-page-metrics-panel";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { LandingPageDTO } from "@/src/schemas/landing-page.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-500/15 text-emerald-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "title",
    header: "Título",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Landing page",
  },
  {
    key: "status",
    header: "Status",
    kind: "select",
    defaultValue: "DRAFT",
    options: [
      { value: "DRAFT", label: "Offline" },
      { value: "PUBLISHED", label: "Online" },
    ],
    optionStyles: STATUS_STYLES,
    readonly: true,
  },
  { key: "slug", header: "Slug", kind: "text", readonly: true },
  {
    key: "viewsCount",
    header: "Acessos",
    kind: "number",
    readonly: true,
  },
  {
    key: "createdById",
    header: "Criado por",
    kind: "relation",
    relationKind: "users",
    readonly: true,
  },
  { key: "createdAt", header: "Data de criação", kind: "readonly-date" },
  { key: "updatedAt", header: "Última atualização", kind: "readonly-date" },
];

export function LandingPagesTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<LandingPageDTO>(
    slug,
    "marketing/pages",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  const [metricsId, setMetricsId] = React.useState<string | null>(null);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="marketing/pages"
        createTitle="página"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar páginas…"
        refetch={refetch}
        onOpenRecord={(record) => setMetricsId(record.id)}
      />
      {metricsId ? (
        <LandingPageMetricsPanel
          slug={slug}
          pageId={metricsId}
          open={metricsId !== null}
          onOpenChange={(open) => {
            if (!open) setMetricsId(null);
          }}
        />
      ) : null}
    </PageShell>
  );
}
