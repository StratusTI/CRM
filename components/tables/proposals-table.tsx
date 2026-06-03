"use client";

import { Add01Icon, FileEmpty02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import type { GridColumn } from "@/components/tables/grid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDocumentTemplates } from "@/src/hooks/use-document-templates";
import { createResource, useResourceList } from "@/src/hooks/use-resource-list";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import type { ProposalDTO } from "@/src/schemas/proposal.schema";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/src/schemas/proposal.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-500/15 text-emerald-600",
};

const TYPE_STYLES: Record<string, string> = {
  PREMISES: "bg-amber-500/15 text-amber-600",
  PORTFOLIO: "bg-violet-500/15 text-violet-600",
  PROPOSAL: "bg-teal-500/15 text-teal-600",
  CONTRACT: "bg-blue-500/15 text-blue-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "title",
    header: "Título",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Documento sem título",
  },
  {
    key: "type",
    header: "Tipo",
    kind: "select",
    defaultValue: "PROPOSAL",
    options: DOCUMENT_TYPES.map((t) => ({
      value: t,
      label: DOCUMENT_TYPE_LABELS[t],
    })),
    optionStyles: TYPE_STYLES,
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
  },
  {
    key: "viewsCount",
    header: "Visualizações",
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

export function ProposalsTable({ slug }: { slug: string }) {
  const router = useRouter();
  const { items, isLoading, refetch } = useResourceList<ProposalDTO>(
    slug,
    "proposals",
  );
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);
  const { templates } = useDocumentTemplates(slug);
  const [creating, setCreating] = useState(false);

  /** Cria o documento (em branco ou a partir de um template) e abre o editor. */
  const onCreate = async (type: DocumentType, templateId?: string) => {
    if (creating) return;
    setCreating(true);
    const res = await createResource<ProposalDTO>(slug, "proposals", {
      type,
      ...(templateId ? { templateId } : {}),
    });
    setCreating(false);
    if (res.ok && res.data) {
      router.push(`/${slug}/proposals/${res.data.id}`);
    } else {
      toast.error(res.message ?? "Não foi possível criar o documento.");
    }
  };

  return (
    <PageShell>
      <DataTable
        columns={COLUMNS}
        data={items}
        slug={slug}
        resource="proposals"
        createTitle="documento"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar documentos…"
        refetch={refetch}
        disableInlineCreate
        headerAction={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" disabled={creating}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Novo documento
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              {DOCUMENT_TYPES.map((type) => {
                const ofType = templates.filter((t) => t.type === type);
                return (
                  <DropdownMenuSub key={type}>
                    <DropdownMenuSubTrigger>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52">
                      <DropdownMenuItem onClick={() => onCreate(type)}>
                        <HugeiconsIcon
                          icon={FileEmpty02Icon}
                          strokeWidth={2}
                          className="size-4 shrink-0"
                        />
                        Em branco
                      </DropdownMenuItem>
                      {ofType.length ? <DropdownMenuSeparator /> : null}
                      {ofType.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => onCreate(type, t.id)}
                        >
                          <span className="truncate">{t.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </PageShell>
  );
}
