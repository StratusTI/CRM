"use client";

import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { EmailTemplateDTO } from "@/src/schemas/email-template.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    required: true,
    primary: true,
    placeholder: "Boas-vindas",
  },
  {
    key: "subject",
    header: "Assunto",
    kind: "text",
    placeholder: "Seja bem-vindo ao nosso CRM",
  },
  {
    key: "contentHtml",
    header: "Conteúdo",
    kind: "emailhtml",
    placeholder: "Escrever email…",
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

export function EmailTemplatesList({ slug }: { slug: string }) {
  const { items, isLoading, refetch } = useResourceList<EmailTemplateDTO>(
    slug,
    "email-templates",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="email-templates"
        createTitle="template"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar templates…"
        refetch={refetch}
      />
    </PageShell>
  );
}
