"use client";

import {
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  TextFontIcon,
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
import { Switch } from "@/components/ui/switch";
import {
  createCustomField,
  deleteCustomField,
  updateCustomField,
  useCustomFields,
} from "@/src/hooks/use-custom-fields";
import type {
  CUSTOM_FIELD_TYPES,
  CustomFieldDTO,
} from "@/src/schemas/custom-field.schema";

type Entity = "COMPANY" | "PERSON" | "OPPORTUNITY";
type FieldType = (typeof CUSTOM_FIELD_TYPES)[number];

const ENTITY_LABELS: Record<Entity, string> = {
  COMPANY: "Empresas",
  PERSON: "Pessoas",
  OPPORTUNITY: "Oportunidades",
};

const TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Data",
  BOOLEAN: "Sim/Não",
  SELECT: "Seleção",
};

/** Gera uma chave slug a partir do rótulo. */
function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^([0-9])/, "f_$1")
    .slice(0, 60);
}

export function CustomFieldsSection({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const [entity, setEntity] = useState<Entity>("COMPANY");
  const { fields, isLoading, refetch } = useCustomFields(slug, entity);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            Campos customizados
          </h2>
          <p className="text-muted-foreground text-sm">
            Adicione campos extras às entidades do CRM. Eles aparecem nas tabelas
            e no painel de detalhes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
            <SelectTrigger size="sm" className="w-40">
              <span>{ENTITY_LABELS[entity]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPANY">Empresas</SelectItem>
              <SelectItem value="PERSON">Pessoas</SelectItem>
              <SelectItem value="OPPORTUNITY">Oportunidades</SelectItem>
            </SelectContent>
          </Select>
          {canManage ? (
            <FieldDialog
              slug={slug}
              entity={entity}
              onSaved={refetch}
              trigger={
                <Button size="sm">
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                  Novo campo
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : fields.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Nenhum campo customizado para {ENTITY_LABELS[entity]}.
          </p>
        ) : (
          fields.map((field) => (
            <FieldCard
              key={field.id}
              slug={slug}
              field={field}
              canManage={canManage}
              onChanged={refetch}
            />
          ))
        )}
      </div>
    </section>
  );
}

function FieldCard({
  slug,
  field,
  canManage,
  onChanged,
}: {
  slug: string;
  field: CustomFieldDTO;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleDelete() {
    setRemoving(true);
    const result = await deleteCustomField(slug, field.id);
    setRemoving(false);
    if (result.ok) {
      toast.success("Campo removido.");
      onChanged();
    } else {
      toast.error(result.message ?? "Não foi possível remover o campo.");
    }
  }

  return (
    <Card
      size="sm"
      className="flex-row items-center justify-between gap-4 px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <HugeiconsIcon icon={TextFontIcon} className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium text-sm">
            {field.label}
            {field.required ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 text-xs">
                obrigatório
              </span>
            ) : null}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            {TYPE_LABELS[field.type]} · <code>{field.key}</code>
            {field.type === "SELECT" ? ` · ${field.options.length} opções` : ""}
          </p>
        </div>
      </div>
      {canManage ? (
        <div className="flex shrink-0 items-center gap-1">
          <FieldDialog
            slug={slug}
            entity={field.entity}
            field={field}
            onSaved={onChanged}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Editar campo">
                <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
              </Button>
            }
          />
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover campo"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover “{field.label}”?</DialogTitle>
                <DialogDescription>
                  Os valores preenchidos deste campo serão apagados. Esta ação
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
                  Remover
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </Card>
  );
}

function FieldDialog({
  slug,
  entity,
  field,
  trigger,
  onSaved,
}: {
  slug: string;
  entity: Entity;
  field?: CustomFieldDTO;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const isEdit = Boolean(field);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<FieldType>(field?.type ?? "TEXT");
  const [required, setRequired] = useState(field?.required ?? false);
  const [optionsText, setOptionsText] = useState(
    (field?.options ?? []).join("\n"),
  );

  function reset() {
    setLabel(field?.label ?? "");
    setType(field?.type ?? "TEXT");
    setRequired(field?.required ?? false);
    setOptionsText((field?.options ?? []).join("\n"));
  }

  async function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast.error("Informe o rótulo do campo.");
      return;
    }
    const options = optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (type === "SELECT" && options.length === 0) {
      toast.error("Campos de seleção precisam de ao menos uma opção.");
      return;
    }

    setSaving(true);
    const result =
      isEdit && field
        ? await updateCustomField(slug, field.id, {
            label: trimmedLabel,
            required,
            ...(type === "SELECT" ? { options } : {}),
          })
        : await createCustomField(slug, {
            entity,
            key: slugifyKey(trimmedLabel),
            label: trimmedLabel,
            type,
            required,
            options: type === "SELECT" ? options : [],
          });
    setSaving(false);

    if (result.ok) {
      toast.success(isEdit ? "Campo atualizado." : "Campo criado.");
      setOpen(false);
      onSaved();
    } else {
      toast.error(result.message ?? "Não foi possível salvar o campo.");
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
          <DialogTitle>{isEdit ? "Editar campo" : "Novo campo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "O tipo e a chave não podem ser alterados após a criação."
              : `Campo customizado para ${ENTITY_LABELS[entity]}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-label">Rótulo</Label>
            <Input
              id="cf-label"
              value={label}
              placeholder="Segmento"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {!isEdit ? (
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as FieldType)}
              >
                <SelectTrigger className="w-full">
                  <span>{TYPE_LABELS[type]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Texto</SelectItem>
                  <SelectItem value="NUMBER">Número</SelectItem>
                  <SelectItem value="DATE">Data</SelectItem>
                  <SelectItem value="BOOLEAN">Sim/Não</SelectItem>
                  <SelectItem value="SELECT">Seleção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {type === "SELECT" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-options">Opções (uma por linha)</Label>
              <textarea
                id="cf-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                placeholder={"Enterprise\nPME\nStartup"}
                className="rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm">
            <Switch checked={required} onCheckedChange={setRequired} />
            Campo obrigatório
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {isEdit ? "Salvar" : "Criar campo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
