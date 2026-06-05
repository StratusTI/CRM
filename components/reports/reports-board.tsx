"use client";

import {
  Delete02Icon,
  Download04Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import {
  REPORT_FIELDS,
  SOURCE_LABELS,
} from "@/components/reports/report-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  createReport,
  deleteReport,
  exportReportUrl,
  fetchReportData,
  useReports,
} from "@/src/hooks/use-reports";
import {
  REPORT_SOURCES,
  type ReportData,
  type ReportDTO,
  type ReportSource,
} from "@/src/schemas/report.schema";

export function ReportsBoard({ slug }: { slug: string }) {
  const { reports, isLoading, refetch } = useReports(slug);
  const [selected, setSelected] = React.useState<ReportDTO | null>(null);

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl gap-4 px-4 py-6 sm:px-6">
        {/* Lista lateral */}
        <aside className="w-56 shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading font-semibold text-sm tracking-tight">
              Relatórios
            </h2>
            <ReportDialog
              slug={slug}
              onSaved={refetch}
              trigger={
                <Button size="icon-sm" variant="ghost" aria-label="Novo">
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                </Button>
              }
            />
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col gap-1">
              {reports.map((report) => (
                <button
                  type="button"
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className={`rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted/60 ${
                    selected?.id === report.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <span className="block truncate">{report.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {SOURCE_LABELS[report.source]}
                  </span>
                </button>
              ))}
              {reports.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Nenhum relatório ainda.
                </p>
              ) : null}
            </div>
          )}
        </aside>

        {/* Preview */}
        <div className="min-w-0 flex-1">
          {selected ? (
            <ReportPreview
              slug={slug}
              report={selected}
              onDeleted={() => {
                setSelected(null);
                refetch();
              }}
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
              Selecione ou crie um relatório.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function ReportPreview({
  slug,
  report,
  onDeleted,
}: {
  slug: string;
  report: ReportDTO;
  onDeleted: () => void;
}) {
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchReportData(slug, report.id).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [slug, report.id]);

  async function handleDelete() {
    const r = await deleteReport(slug, report.id);
    if (r.ok) {
      toast.success("Relatório excluído.");
      onDeleted();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base">{report.name}</h3>
          <p className="text-muted-foreground text-xs">
            {SOURCE_LABELS[report.source]} · {data?.total ?? 0} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <a href={exportReportUrl(slug, report.id, "csv")} download />
            }
          >
            <HugeiconsIcon icon={Download04Icon} className="size-4" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <a href={exportReportUrl(slug, report.id, "xlsx")} download />
            }
          >
            <HugeiconsIcon icon={Download04Icon} className="size-4" />
            Excel
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Excluir relatório"
            onClick={handleDelete}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground text-sm">
          Sem dados para os filtros atuais.
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs">
              <tr>
                {data.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 100).map((row, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas sem id estável
                <tr key={i} className="border-t">
                  {data.columns.map((col) => (
                    <td key={col} className="px-3 py-1.5">
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function ReportDialog({
  slug,
  trigger,
  onSaved,
}: {
  slug: string;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [source, setSource] = React.useState<ReportSource>("companies");
  const [columns, setColumns] = React.useState<string[]>([]);
  const [groupBy, setGroupBy] = React.useState<string>("");

  const fields = REPORT_FIELDS[source];

  function reset() {
    setName("");
    setSource("companies");
    setColumns([]);
    setGroupBy("");
  }

  function toggleColumn(key: string) {
    setColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do relatório.");
      return;
    }
    if (columns.length === 0) {
      toast.error("Selecione ao menos uma coluna.");
      return;
    }
    setSaving(true);
    const result = await createReport(slug, {
      name: name.trim(),
      source,
      columns,
      filters: [],
      groupBy: groupBy || undefined,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Relatório criado.");
      setOpen(false);
      onSaved();
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
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo relatório</DialogTitle>
          <DialogDescription>
            Escolha a fonte e as colunas. Exporte em CSV ou Excel depois.
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
              onValueChange={(v) => {
                setSource(v as ReportSource);
                setColumns([]);
                setGroupBy("");
              }}
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colunas</Label>
            <div className="flex flex-wrap gap-1.5">
              {fields.map((f) => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => toggleColumn(f.key)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    columns.includes(f.key)
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Agrupar por (opcional)</Label>
            <Select
              value={groupBy || "__none__"}
              onValueChange={(v) => setGroupBy(!v || v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <span>
                  {groupBy
                    ? (fields.find((f) => f.key === groupBy)?.label ?? groupBy)
                    : "Não agrupar"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não agrupar</SelectItem>
                {fields.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            Criar relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
