"use client";

import {
  Add01Icon,
  Analytics01Icon,
  ArrowDown01Icon,
  ArrowLeft02Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete02Icon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { FormStatsPanel } from "@/components/forms/form-stats-panel";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveForm, useForm } from "@/src/hooks/use-form";
import {
  ACTION_TARGETS,
  type ActionConfig,
  type FieldTarget,
  FORM_FIELD_TYPES,
  type FormActionType,
  type FormDTO,
  type FormFieldDef,
  type FormFieldType,
  type PublicFormDTO,
  TARGET_ATTRIBUTES,
} from "@/src/schemas/form.schema";
import { OPPORTUNITY_STAGES } from "@/src/schemas/opportunity.schema";

const ACTION_LABELS: Record<FormActionType, string> = {
  COMPANY: "Empresa",
  PERSON: "Pessoa",
  LEAD: "Lead (pessoa + oportunidade)",
};

const TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto",
  email: "E-mail",
  phone: "Telefone",
  number: "Número",
  textarea: "Texto longo",
  select: "Seleção",
  checkbox: "Caixa de seleção",
  url: "URL",
  date: "Data",
};

const TARGET_LABELS: Record<FieldTarget, string> = {
  person: "Pessoa",
  company: "Empresa",
  opportunity: "Oportunidade",
};

const ATTR_LABELS: Record<FieldTarget, Record<string, string>> = {
  person: {
    name: "Nome",
    email: "E-mail",
    phone: "Telefone",
    city: "Cidade",
    jobTitle: "Cargo",
    linkedin: "LinkedIn",
    avatar: "Avatar",
  },
  company: {
    name: "Nome",
    cnpj: "CNPJ",
    domain: "Domínio",
    employees: "Funcionários",
    linkedin: "LinkedIn",
    arr: "ARR",
  },
  opportunity: {
    name: "Nome",
    amount: "Valor",
    source: "Origem",
    stage: "Estágio",
    closeDate: "Data de fechamento",
  },
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "Novo",
  QUALIFIED: "Qualificado",
  MEETING: "Reunião",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  LOST: "Perdido",
};

type MappingOption = {
  value: string;
  label: string;
  target: FieldTarget;
  attribute: string;
};

function mappingOptionsFor(action: FormActionType): MappingOption[] {
  const options: MappingOption[] = [];
  for (const target of ACTION_TARGETS[action] as readonly FieldTarget[]) {
    for (const attribute of TARGET_ATTRIBUTES[target]) {
      options.push({
        value: `${target}.${attribute}`,
        label: `${TARGET_LABELS[target]} → ${ATTR_LABELS[target][attribute] ?? attribute}`,
        target,
        attribute,
      });
    }
  }
  return options;
}

function defaultMapping(action: FormActionType): {
  target: FieldTarget;
  attribute: string;
} {
  const first = mappingOptionsFor(action)[0];
  return { target: first.target, attribute: first.attribute };
}

function toPublicForm(
  name: string,
  description: string,
  fields: FormFieldDef[],
  successMessage: string,
): PublicFormDTO {
  return {
    id: "preview",
    name,
    description: description || null,
    successMessage: successMessage || null,
    fields: fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: f.options,
    })),
  };
}

export function FormBuilder({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  const { form, isLoading, error } = useForm(slug, formId);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  if (error || !form) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        {error ?? "Formulário não encontrado."}
      </div>
    );
  }
  return <FormBuilderInner slug={slug} initial={form} />;
}

function FormBuilderInner({
  slug,
  initial,
}: {
  slug: string;
  initial: FormDTO;
}) {
  const router = useRouter();

  const [name, setName] = React.useState(initial.name);
  const [description, setDescription] = React.useState(
    initial.description ?? "",
  );
  const [action, setAction] = React.useState<FormActionType>(initial.action);
  const [fields, setFields] = React.useState<FormFieldDef[]>(initial.fields);
  const [config, setConfig] = React.useState<ActionConfig>(
    initial.actionConfig,
  );
  const [successMessage, setSuccessMessage] = React.useState(
    initial.successMessage ?? "",
  );
  const [status, setStatus] = React.useState(initial.status);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);

  const online = status === "PUBLISHED";
  const mappingOptions = React.useMemo(
    () => mappingOptionsFor(action),
    [action],
  );

  const keyCounter = React.useRef(initial.fields.length);

  const buildPayload = () => ({
    name: name.trim() || "Formulário sem título",
    description: description.trim() ? description.trim() : null,
    action,
    fields,
    actionConfig: config,
    successMessage: successMessage.trim() ? successMessage.trim() : null,
  });

  const onSave = async () => {
    setSaving(true);
    const res = await saveForm(slug, initial.id, buildPayload());
    setSaving(false);
    if (res.ok) toast.success("Formulário salvo");
    else toast.error(res.message ?? "Não foi possível salvar.");
  };

  const onTogglePublish = async (next: boolean) => {
    const desired = next ? "PUBLISHED" : "DRAFT";
    setPublishing(true);
    // Salva o estado atual junto da mudança de status — a validação de publish
    // roda contra os campos enviados agora, não contra os persistidos antes.
    const res = await saveForm(slug, initial.id, {
      ...buildPayload(),
      status: desired,
    });
    setPublishing(false);
    if (res.ok) {
      setStatus(desired);
      toast.success(next ? "Formulário publicado" : "Formulário despublicado");
    } else {
      toast.error(res.message ?? "Não foi possível alterar a publicação.");
    }
  };

  const onChangeAction = (next: FormActionType) => {
    const allowed = ACTION_TARGETS[next] as readonly FieldTarget[];
    const fallback = defaultMapping(next);
    // Reseta mapeamentos incompatíveis com a nova ação.
    setFields((cur) =>
      cur.map((f) =>
        allowed.includes(f.mapping.target) ? f : { ...f, mapping: fallback },
      ),
    );
    setAction(next);
  };

  const addField = () => {
    keyCounter.current += 1;
    const newField: FormFieldDef = {
      key: `campo_${keyCounter.current}`,
      label: "Novo campo",
      type: "text",
      required: false,
      mapping: defaultMapping(action),
    };
    setFields((cur) => [...cur, newField]);
  };

  const updateField = (index: number, patch: Partial<FormFieldDef>) =>
    setFields((cur) =>
      cur.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );

  const removeField = (index: number) =>
    setFields((cur) => cur.filter((_, i) => i !== index));

  const moveField = (index: number, dir: -1 | 1) => {
    setFields((cur) => {
      const next = [...cur];
      const target = index + dir;
      if (target < 0 || target >= next.length) return cur;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(initial.publicUrl);
    toast.success("URL pública copiada");
  };

  const preview = toPublicForm(name, description, fields, successMessage);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Voltar"
          onClick={() => router.push(`/${slug}/forms`)}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
        </Button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Formulário sem título"
          aria-label="Nome do formulário"
          className="min-w-0 flex-1 bg-transparent font-semibold text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {online ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={initial.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
                Abrir
              </a>
            }
          />
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStatsOpen(true)}
          aria-label="Ver respostas"
        >
          <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />
          Respostas
          {initial.submissionCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary tabular-nums">
              {initial.submissionCount}
            </span>
          ) : null}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </header>

      <FormStatsPanel
        open={statsOpen}
        onOpenChange={setStatsOpen}
        slug={slug}
        formId={initial.id}
        formName={name}
        fields={fields}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* editor */}
        <div className="min-w-0 flex-1 overflow-y-auto border-b lg:border-r lg:border-b-0">
          <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
            {/* configurações */}
            <section className="flex flex-col gap-4">
              <h2 className="font-medium text-sm">Configurações</h2>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-description">Descrição</Label>
                <Textarea
                  id="form-description"
                  value={description}
                  placeholder="Texto exibido abaixo do título"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Ação no envio</Label>
                <Select
                  value={action}
                  onValueChange={(v) => onChangeAction(v as FormActionType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACTION_LABELS) as FormActionType[]).map(
                      (a) => (
                        <SelectItem key={a} value={a}>
                          {ACTION_LABELS[a]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {action === "LEAD" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="opp-source">Origem da oportunidade</Label>
                    <Input
                      id="opp-source"
                      value={config.opportunitySource ?? ""}
                      placeholder="FORMULÁRIO"
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          opportunitySource: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Estágio inicial</Label>
                    <Select
                      value={config.opportunityStage ?? "NEW"}
                      onValueChange={(v) =>
                        setConfig((c) => ({
                          ...c,
                          opportunityStage:
                            v as (typeof OPPORTUNITY_STAGES)[number],
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPPORTUNITY_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STAGE_LABELS[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {action === "COMPANY" ? (
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={config.icp ?? false}
                    onCheckedChange={(checked) =>
                      setConfig((c) => ({ ...c, icp: checked }))
                    }
                  />
                  Marcar empresas como ICP
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="form-success">Mensagem de sucesso</Label>
                <Input
                  id="form-success"
                  value={successMessage}
                  placeholder="Recebemos suas informações. Obrigado!"
                  onChange={(e) => setSuccessMessage(e.target.value)}
                />
              </div>
            </section>

            {/* publicação */}
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">Publicar formulário</p>
                  <p className="text-muted-foreground text-xs">
                    Disponibiliza a URL pública para receber respostas.
                  </p>
                </div>
                <Switch
                  checked={online}
                  disabled={publishing}
                  onCheckedChange={onTogglePublish}
                />
              </div>
              {online ? (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={initial.publicUrl}
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Copiar URL"
                    onClick={copyUrl}
                  >
                    <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                  </Button>
                </div>
              ) : null}
            </section>

            {/* campos */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-sm">Campos</h2>
                <Button variant="outline" size="sm" onClick={addField}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Adicionar campo
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                  Nenhum campo ainda. Adicione campos para montar o formulário.
                </p>
              ) : null}

              {fields.map((field, index) => (
                <FieldEditor
                  key={field.key}
                  field={field}
                  index={index}
                  total={fields.length}
                  mappingOptions={mappingOptions}
                  onChange={(patch) => updateField(index, patch)}
                  onRemove={() => removeField(index)}
                  onMove={(dir) => moveField(index, dir)}
                />
              ))}
            </section>
          </div>
        </div>

        {/* preview */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-muted/30">
          <div className="mx-auto max-w-xl p-6">
            <p className="mb-3 text-muted-foreground text-xs uppercase tracking-wide">
              Pré-visualização
            </p>
            <PublicFormRenderer form={preview} preview />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  index,
  total,
  mappingOptions,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormFieldDef;
  index: number;
  total: number;
  mappingOptions: MappingOption[];
  onChange: (patch: Partial<FormFieldDef>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const mappingValue = `${field.mapping.target}.${field.mapping.attribute}`;

  const setOption = (i: number, label: string) =>
    onChange({
      options: (field.options ?? []).map((o, idx) =>
        idx === i ? { label, value: label } : o,
      ),
    });
  const addOption = () =>
    onChange({
      options: [...(field.options ?? []), { label: "Opção", value: "Opção" }],
    });
  const removeOption = (i: number) =>
    onChange({ options: (field.options ?? []).filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          placeholder="Rótulo do campo"
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mover para cima"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mover para baixo"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remover campo"
          onClick={onRemove}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <Select
            value={field.type}
            onValueChange={(v) => onChange({ type: v as FormFieldType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORM_FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Preenche</Label>
          <Select
            value={mappingValue}
            onValueChange={(v) => {
              const opt = mappingOptions.find((o) => o.value === v);
              if (opt)
                onChange({
                  mapping: { target: opt.target, attribute: opt.attribute },
                });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mappingOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Placeholder</Label>
        <Input
          value={field.placeholder ?? ""}
          placeholder="Texto de ajuda exibido no campo"
          onChange={(e) =>
            onChange({ placeholder: e.target.value || undefined })
          }
        />
      </div>

      {field.type === "select" ? (
        <div className="flex flex-col gap-2">
          <Label>Opções</Label>
          {(field.options ?? []).map((opt, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: opções sem id estável
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt.label}
                placeholder="Opção"
                onChange={(e) => setOption(i, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remover opção"
                onClick={() => removeOption(i)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOption}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Adicionar opção
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-sm">
        <Switch
          checked={field.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
        Campo obrigatório
      </div>
    </div>
  );
}
