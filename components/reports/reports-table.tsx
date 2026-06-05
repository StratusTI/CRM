"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageShell } from "@/components/page-shell";
import {
  REPORT_FIELDS,
  SOURCE_LABELS,
} from "@/components/reports/report-fields";
import type { GridColumn } from "@/components/tables/grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { createReport, useReports } from "@/src/hooks/use-reports";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import {
  REPORT_SOURCES,
  type ReportDTO,
  type ReportSource,
} from "@/src/schemas/report.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const SOURCE_STYLES: Record<ReportSource, string> = {
  companies: "bg-blue-500/15 text-blue-600",
  people: "bg-emerald-500/15 text-emerald-600",
  opportunities: "bg-violet-500/15 text-violet-600",
  leads: "bg-amber-500/15 text-amber-600",
  tasks: "bg-sky-500/15 text-sky-600",
  notes: "bg-rose-500/15 text-rose-600",
  products: "bg-teal-500/15 text-teal-600",
};

const COLUMNS: GridColumn[] = [
  {
    key: "name",
    header: "Nome",
    kind: "text",
    primary: true,
    linkView: true,
    placeholder: "Oportunidades por origem",
  },
  {
    key: "source",
    header: "Fonte",
    kind: "select",
    readonly: true,
    options: REPORT_SOURCES.map((s) => ({
      value: s,
      label: SOURCE_LABELS[s],
    })),
    optionStyles: SOURCE_STYLES,
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

export function ReportsTable({ slug }: { slug: string }) {
  const router = useRouter();
  const { reports, isLoading, refetch } = useReports(slug);
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <PageShell>
      <DataTable<ReportDTO>
        columns={COLUMNS}
        data={reports}
        slug={slug}
        resource="reports"
        createTitle="relatório"
        lookups={lookups}
        isLoading={isLoading}
        searchPlaceholder="Buscar relatórios…"
        refetch={refetch}
        disableInlineCreate
        headerAction={<CreateReportDialog slug={slug} />}
        onOpenRecord={(record) => router.push(`/${slug}/reports/${record.id}`)}
      />
    </PageShell>
  );
}

/** Dialog de criação: define nome e fonte (imutável) e abre o builder. */
function CreateReportDialog({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [source, setSource] = React.useState<ReportSource>("companies");

  function reset() {
    setName("");
    setSource("companies");
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Informe o nome do relatório.");
      return;
    }
    setSaving(true);
    const result = await createReport(slug, {
      name: name.trim(),
      source,
      // Começa com a primeira coluna da fonte; o usuário ajusta no builder.
      columns: [REPORT_FIELDS[source][0].key],
      filters: [],
    });
    setSaving(false);
    if (result.ok && result.data) {
      setOpen(false);
      router.push(`/${slug}/reports/${result.data.id}`);
    } else {
      toast.error(result.message ?? "Não foi possível criar o relatório.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Novo relatório
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo relatório</DialogTitle>
          <DialogDescription>
            Escolha a fonte de dados. As colunas e filtros você define em
            seguida no construtor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-name">Nome</Label>
            <Input
              id="report-name"
              value={name}
              placeholder="Oportunidades por origem"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Fonte</Label>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as ReportSource)}
            >
              <SelectTrigger className="w-full">
                <span>{SOURCE_LABELS[source]}</span>
              </SelectTrigger>
              <SelectContent>
                {REPORT_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              A fonte não pode ser alterada depois de criada.
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Criando…" : "Criar e abrir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
