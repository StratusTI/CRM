"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { Button } from "@/components/ui/button";
import { createResource, useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { FormDTO } from "@/src/schemas/form.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-500/15 text-emerald-600",
};

const ACTION_STYLES: Record<string, string> = {
  COMPANY: "bg-blue-500/15 text-blue-600",
  PERSON: "bg-emerald-500/15 text-emerald-600",
  LEAD: "bg-amber-500/15 text-amber-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Formulário de contato",
  },
  {
    key: "action",
    header: "Ação",
    kind: "select",
    readonly: true,
    options: [
      { value: "COMPANY", label: "Empresa" },
      { value: "PERSON", label: "Pessoa" },
      { value: "LEAD", label: "Lead" },
    ],
    optionStyles: ACTION_STYLES,
  },
  {
    key: "status",
    header: "Status",
    kind: "select",
    readonly: true,
    options: [
      { value: "DRAFT", label: "Offline" },
      { value: "PUBLISHED", label: "Online" },
    ],
    optionStyles: STATUS_STYLES,
  },
  {
    key: "submissionCount",
    header: "Submissões",
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
  { key: "createdAt", header: "Criado em", kind: "readonly-date" },
  { key: "updatedAt", header: "Última atualização", kind: "readonly-date" },
];

export function FormsTable({ slug }: { slug: string }) {
  const router = useRouter();
  const { items, isLoading, refetch } = useResourceList<FormDTO>(slug, "forms");
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    setCreating(true);
    const res = await createResource<FormDTO>(slug, "forms", {
      name: "Novo formulário",
    });
    setCreating(false);
    if (res.ok && res.data) {
      router.push(`/${slug}/forms/${res.data.id}`);
    } else {
      toast.error(res.message ?? "Não foi possível criar o formulário.");
    }
  };

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="forms"
        createTitle="formulário"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar formulários…"
        refetch={refetch}
        disableInlineCreate
        headerAction={
          <Button size="sm" onClick={onCreate} disabled={creating}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Novo formulário
          </Button>
        }
        onOpenRecord={(record) => router.push(`/${slug}/forms/${record.id}`)}
      />
    </PageShell>
  );
}
