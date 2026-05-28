"use client";

import { Cancel01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listRuns, resumeRun } from "@/src/hooks/use-workflow";
import type {
  WorkflowRunDTO,
  WorkflowRunStatus,
} from "@/src/schemas/workflow.schema";

const STATUS_COLOR: Record<WorkflowRunStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  RUNNING: "bg-amber-500/10 text-amber-600",
  WAITING: "bg-sky-500/10 text-sky-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  FAILED: "bg-rose-500/10 text-rose-600",
  CANCELED: "bg-zinc-500/10 text-zinc-600",
};

export function WorkflowRunsDrawer({
  slug,
  workflowId,
  open,
  onOpenChange,
}: {
  slug: string;
  workflowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [runs, setRuns] = useState<WorkflowRunDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    setLoading(true);
    listRuns(slug, workflowId)
      .then(setRuns)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slug, workflowId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[480px] !max-w-[480px] overflow-auto p-0"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <span className="text-sm font-semibold">Histórico de execuções</span>
          <SheetClose
            className="ml-auto"
            render={
              <Button variant="ghost" size="icon-sm">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            }
          />
        </div>
        <div className="flex-1 space-y-2 p-3">
          {loading && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}
          {!loading && runs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma execução ainda. Use “Test” pra disparar uma run.
            </p>
          )}
          {!loading &&
            runs.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border bg-card p-3 text-card-foreground"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                      STATUS_COLOR[run.status],
                    )}
                  >
                    {run.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {run.triggerType}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
                {run.error && (
                  <p className="mt-2 rounded bg-rose-500/10 p-2 text-xs text-rose-600">
                    {run.error}
                  </p>
                )}
                {run.steps && run.steps.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {run.steps.map((step) => (
                      <li
                        key={step.id}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <span
                          className={cn(
                            "rounded px-1.5 py-px text-[10px] uppercase",
                            step.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : step.status === "FAILED"
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {step.status}
                        </span>
                        <span className="truncate">
                          {step.nodeType} · {step.nodeId}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {run.status === "WAITING" && (
                  <ResumeForm
                    slug={slug}
                    workflowId={workflowId}
                    run={run}
                    onResolved={refresh}
                  />
                )}
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResumeForm({
  slug,
  workflowId,
  run,
  onResolved,
}: {
  slug: string;
  workflowId: string;
  run: WorkflowRunDTO;
  onResolved: () => void;
}) {
  const waitingStep = run.steps?.find((s) => s.id === run.waitingStepId);
  const fields =
    (waitingStep?.output as { fields?: string[] } | null)?.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (fields.length === 0) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await resumeRun(slug, workflowId, run.id, values);
    setSubmitting(false);
    if (res) {
      toast.success("Run retomada");
      onResolved();
    } else {
      toast.error("Falha ao retomar a run.");
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-3">
      <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
        Aguardando preenchimento
      </p>
      {fields.map((name) => (
        <div key={name} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{name}</Label>
          <Input
            value={values[name] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [name]: e.target.value }))
            }
            className="h-8"
          />
        </div>
      ))}
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
      >
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
        Continuar
      </Button>
    </div>
  );
}
