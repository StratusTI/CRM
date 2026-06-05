"use client";

import {
  ArrowLeft02Icon,
  Delete02Icon,
  Download04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  REPORT_FIELDS,
  SOURCE_LABELS,
} from "@/components/reports/report-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteReport,
  exportReportUrl,
  fetchReportData,
  updateReport,
  useReport,
} from "@/src/hooks/use-reports";
import type { ReportData, ReportDTO } from "@/src/schemas/report.schema";

export function ReportBuilder({
  slug,
  reportId,
}: {
  slug: string;
  reportId: string;
}) {
  const { report, isLoading, error } = useReport(slug, reportId);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  if (error || !report) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        {error ?? "Relatório não encontrado."}
      </div>
    );
  }
  return <ReportBuilderInner slug={slug} initial={report} />;
}

function ReportBuilderInner({
  slug,
  initial,
}: {
  slug: string;
  initial: ReportDTO;
}) {
  const router = useRouter();
  const fields = REPORT_FIELDS[initial.source];

  const [name, setName] = React.useState(initial.name);
  const [columns, setColumns] = React.useState<string[]>(initial.columns);
  const [groupBy, setGroupBy] = React.useState<string>(initial.groupBy ?? "");

  const [data, setData] = React.useState<ReportData | null>(null);
  const [loadingData, setLoadingData] = React.useState(true);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const refreshPreview = React.useCallback(async () => {
    setLoadingData(true);
    const d = await fetchReportData(slug, initial.id);
    setData(d);
    setLoadingData(false);
  }, [slug, initial.id]);

  // Preview inicial.
  React.useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  // Auto-save (debounce) sempre que a configuração muda — atualiza o preview
  // depois de persistir. Pula a primeira renderização (estado == inicial).
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (columns.length === 0) return; // schema exige ao menos uma coluna
    setStatus("saving");
    const timer = setTimeout(async () => {
      const res = await updateReport(slug, initial.id, {
        name: name.trim() || "Relatório sem título",
        columns,
        groupBy: groupBy || null,
      });
      if (res.ok) {
        setStatus("saved");
        await refreshPreview();
      } else {
        setStatus("idle");
        toast.error(res.message ?? "Não foi possível salvar.");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [name, columns, groupBy, slug, initial.id, refreshPreview]);

  function toggleColumn(key: string) {
    setColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  async function handleDelete() {
    const r = await deleteReport(slug, initial.id);
    if (r.ok) {
      toast.success("Relatório excluído.");
      router.push(`/${slug}/reports`);
    } else {
      toast.error("Não foi possível excluir o relatório.");
    }
  }

  const noColumns = columns.length === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Voltar"
          onClick={() => router.push(`/${slug}/reports`)}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
        </Button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Relatório sem título"
          aria-label="Nome do relatório"
          className="min-w-0 flex-1 bg-transparent font-semibold text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <span className="mr-1 text-muted-foreground text-xs tabular-nums">
          {status === "saving"
            ? "Salvando…"
            : status === "saved"
              ? "Salvo"
              : ""}
        </span>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <a href={exportReportUrl(slug, initial.id, "csv")} download>
              <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
              CSV
            </a>
          }
        />
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <a href={exportReportUrl(slug, initial.id, "xlsx")} download>
              <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
              Excel
            </a>
          }
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Excluir relatório"
          onClick={handleDelete}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* configuração */}
        <div className="min-w-0 overflow-y-auto border-b lg:w-80 lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-1.5">
              <Label>Fonte</Label>
              <span className="inline-flex w-fit items-center rounded-md bg-muted px-2.5 py-1 font-medium text-sm">
                {SOURCE_LABELS[initial.source]}
              </span>
              <p className="text-muted-foreground text-xs">
                A fonte é definida na criação e não pode ser alterada.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Colunas</Label>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <button
                    type="button"
                    key={f.key}
                    onClick={() => toggleColumn(f.key)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      columns.includes(f.key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {noColumns ? (
                <p className="text-destructive text-xs">
                  Selecione ao menos uma coluna.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Agrupar por (opcional)</Label>
              <Select
                value={groupBy || "__none__"}
                onValueChange={(v) =>
                  setGroupBy(!v || v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <span>
                    {groupBy
                      ? (fields.find((f) => f.key === groupBy)?.label ??
                        groupBy)
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
        </div>

        {/* preview */}
        <div className="min-w-0 flex-1 overflow-auto bg-muted/30">
          <div className="flex flex-col gap-3 p-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Pré-visualização
              </p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {data?.total ?? 0} registros
              </p>
            </div>

            {loadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : !data || data.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-card py-16 text-center text-muted-foreground text-sm">
                Sem dados para a configuração atual.
              </p>
            ) : (
              <div className="overflow-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs">
                    <tr>
                      {data.columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium"
                        >
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
        </div>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}
