"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
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
  createPipeline,
  deletePipeline,
  updatePipeline,
  usePipelines,
} from "@/src/hooks/use-pipelines";
import type { PipelineDTO } from "@/src/schemas/pipeline.schema";

type Category = "OPEN" | "WON" | "LOST";

const CATEGORY_LABEL: Record<Category, string> = {
  OPEN: "Aberta",
  WON: "Ganho",
  LOST: "Perdido",
};

type StageRow = {
  id?: string;
  name: string;
  probability: number;
  category: Category;
  color: string | null;
};

const NEW_PIPELINE_STAGES: StageRow[] = [
  { name: "Novo", probability: 10, category: "OPEN", color: "#64748b" },
  { name: "Ganho", probability: 100, category: "WON", color: "#10b981" },
  { name: "Perdido", probability: 0, category: "LOST", color: "#f43f5e" },
];

export function PipelinesSection({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const { pipelines, isLoading, refetch } = usePipelines(slug);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            Funis de vendas
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure os funis e suas etapas. A probabilidade de cada etapa
            alimenta a previsão de receita.
          </p>
        </div>
        {canManage ? (
          <PipelineDialog
            slug={slug}
            onSaved={refetch}
            trigger={
              <Button size="sm">
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                Novo funil
              </Button>
            }
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              slug={slug}
              pipeline={pipeline}
              canManage={canManage}
              onChanged={refetch}
            />
          ))
        )}
      </div>
    </section>
  );
}

function PipelineCard({
  slug,
  pipeline,
  canManage,
  onChanged,
}: {
  slug: string;
  pipeline: PipelineDTO;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleDelete() {
    setRemoving(true);
    const result = await deletePipeline(slug, pipeline.id);
    setRemoving(false);
    if (result.ok) {
      toast.success("Funil excluído.");
      onChanged();
    } else {
      toast.error(result.message ?? "Não foi possível excluir o funil.");
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <HugeiconsIcon icon={Target01Icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium text-sm">
              {pipeline.name}
              {pipeline.isDefault ? (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                  Padrão
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground text-xs">
              {pipeline.stages.length} etapas
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            <PipelineDialog
              slug={slug}
              pipeline={pipeline}
              onSaved={onChanged}
              trigger={
                <Button variant="ghost" size="sm">
                  <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
                  Editar
                </Button>
              }
            />
            {pipeline.isDefault ? null : (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Excluir funil"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir “{pipeline.name}”?</DialogTitle>
                    <DialogDescription>
                      Só é possível excluir um funil sem oportunidades. Esta ação
                      não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancelar
                    </DialogClose>
                    <DialogClose
                      render={
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={removing}
                        />
                      }
                    >
                      Excluir
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pipeline.stages.map((stage) => (
          <span
            key={stage.id}
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: stage.color ?? "#94a3b8" }}
            />
            {stage.name}
            <span className="text-muted-foreground">{stage.probability}%</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

function PipelineDialog({
  slug,
  pipeline,
  trigger,
  onSaved,
}: {
  slug: string;
  pipeline?: PipelineDTO;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const isEdit = Boolean(pipeline);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(pipeline?.name ?? "");
  const [stages, setStages] = useState<StageRow[]>(
    pipeline
      ? pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          probability: s.probability,
          category: s.category,
          color: s.color,
        }))
      : NEW_PIPELINE_STAGES.map((s) => ({ ...s })),
  );

  function reset() {
    setName(pipeline?.name ?? "");
    setStages(
      pipeline
        ? pipeline.stages.map((s) => ({
            id: s.id,
            name: s.name,
            probability: s.probability,
            category: s.category,
            color: s.color,
          }))
        : NEW_PIPELINE_STAGES.map((s) => ({ ...s })),
    );
  }

  function updateStage(index: number, patch: Partial<StageRow>) {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function move(index: number, dir: -1 | 1) {
    setStages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      { name: "", probability: 0, category: "OPEN", color: null },
    ]);
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Informe o nome do funil.");
      return;
    }
    if (stages.length === 0 || stages.some((s) => !s.name.trim())) {
      toast.error("Cada etapa precisa de um nome.");
      return;
    }

    const payload = {
      name: trimmedName,
      stages: stages.map((s) => ({
        ...(s.id ? { id: s.id } : {}),
        name: s.name.trim(),
        probability: s.probability,
        category: s.category,
        color: s.color,
      })),
    };

    setSaving(true);
    const result =
      isEdit && pipeline
        ? await updatePipeline(slug, pipeline.id, payload)
        : await createPipeline(slug, payload);
    setSaving(false);

    if (result.ok) {
      toast.success(isEdit ? "Funil atualizado." : "Funil criado.");
      setOpen(false);
      onSaved();
    } else {
      toast.error(result.message ?? "Não foi possível salvar o funil.");
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar funil" : "Novo funil"}</DialogTitle>
          <DialogDescription>
            Defina as etapas, sua ordem e a probabilidade de fechamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pipeline-name">Nome do funil</Label>
            <Input
              id="pipeline-name"
              value={name}
              placeholder="Vendas"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Etapas</Label>
            {stages.map((stage, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas sem id estável durante a edição
                key={index}
                className="flex items-center gap-1.5"
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Mover para cima"
                  >
                    <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === stages.length - 1}
                    aria-label="Mover para baixo"
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
                  </Button>
                </div>
                <Input
                  value={stage.name}
                  placeholder="Etapa"
                  className="flex-1"
                  onChange={(e) => updateStage(index, { name: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={stage.probability}
                  className="w-16"
                  aria-label="Probabilidade"
                  onChange={(e) =>
                    updateStage(index, {
                      probability: Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
                <Select
                  value={stage.category}
                  onValueChange={(v) =>
                    updateStage(index, { category: v as Category })
                  }
                >
                  <SelectTrigger size="sm" className="w-28">
                    <span>{CATEGORY_LABEL[stage.category]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Aberta</SelectItem>
                    <SelectItem value="WON">Ganho</SelectItem>
                    <SelectItem value="LOST">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStage(index)}
                  disabled={stages.length === 1}
                  aria-label="Remover etapa"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={addStage}
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
              Adicionar etapa
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {isEdit ? "Salvar" : "Criar funil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
