"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import { BILLING_TYPES, type ProductDTO } from "@/src/schemas/product.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const BILLING_LABELS: Record<(typeof BILLING_TYPES)[number], string> = {
  ONE_TIME: "Único",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

const BILLING_STYLES: Record<(typeof BILLING_TYPES)[number], string> = {
  ONE_TIME: "bg-slate-500/15 text-slate-600",
  MONTHLY: "bg-blue-500/15 text-blue-600",
  YEARLY: "bg-violet-500/15 text-violet-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Plano Pro",
  },
  { key: "sku", header: "SKU", kind: "text", placeholder: "PRO-001" },
  { key: "unitPrice", header: "Preço", kind: "money", placeholder: "199" },
  {
    key: "billingType",
    header: "Cobrança",
    kind: "select",
    defaultValue: "ONE_TIME",
    options: BILLING_TYPES.map((b) => ({ value: b, label: BILLING_LABELS[b] })),
    optionStyles: BILLING_STYLES,
  },
  {
    key: "description",
    header: "Descrição",
    kind: "text",
    placeholder: "Resumo do produto",
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

export function ProductsTable({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<ProductDTO>(
    slug,
    "products",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="products"
        createTitle="produto"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar produtos…"
        refetch={refetch}
      />
    </PageShell>
  );
}
