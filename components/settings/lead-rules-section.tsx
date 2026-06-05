"use client";

import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createRoutingRule,
  createScoringRule,
  deleteRoutingRule,
  deleteScoringRule,
  useRoutingRules,
  useScoringRules,
} from "@/src/hooks/use-lead-rules";
import {
  type LookupKind,
  useWorkspaceLookups,
} from "@/src/hooks/use-workspace-lookups";
import {
  LEAD_RULE_FIELDS,
  LEAD_RULE_OPERATORS,
} from "@/src/schemas/lead.schema";

const LOOKUP_KINDS: LookupKind[] = ["users"];

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  company: "Empresa",
  jobTitle: "Cargo",
  source: "Origem",
  city: "Cidade",
};
const OP_LABELS: Record<string, string> = {
  equals: "é igual a",
  not_equals: "é diferente de",
  contains: "contém",
  is_empty: "está vazio",
  is_not_empty: "não está vazio",
};

type Field = (typeof LEAD_RULE_FIELDS)[number];
type Operator = (typeof LEAD_RULE_OPERATORS)[number];

function needsValue(op: Operator) {
  return op !== "is_empty" && op !== "is_not_empty";
}

export function LeadRulesSection({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const scoring = useScoringRules(slug);
  const routing = useRoutingRules(slug);
  const { lookups } = useWorkspaceLookups(slug, LOOKUP_KINDS);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 space-y-1">
        <h2 className="font-heading font-semibold text-lg tracking-tight">
          Regras de leads
        </h2>
        <p className="text-muted-foreground text-sm">
          Pontuação automática (scoring) e atribuição de responsável (roteamento)
          dos leads recebidos.
        </p>
      </div>

      {/* Scoring */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-sm">Pontuação</h3>
        </div>
        {scoring.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            {scoring.rules.map((rule) => (
              <Card
                key={rule.id}
                size="sm"
                className="flex-row items-center justify-between gap-3 px-4 py-2.5"
              >
                <p className="text-sm">
                  Se <strong>{FIELD_LABELS[rule.field]}</strong>{" "}
                  {OP_LABELS[rule.operator]}
                  {rule.value ? ` "${rule.value}"` : ""} →{" "}
                  <strong>
                    {rule.points > 0 ? `+${rule.points}` : rule.points}
                  </strong>{" "}
                  pts
                </p>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover regra"
                    onClick={async () => {
                      const r = await deleteScoringRule(slug, rule.id);
                      if (r.ok) scoring.refetch();
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                ) : null}
              </Card>
            ))}
            {canManage ? (
              <ScoringRuleForm slug={slug} onSaved={scoring.refetch} />
            ) : null}
          </div>
        )}
      </div>

      {/* Routing */}
      <div>
        <h3 className="mb-2 font-medium text-sm">Roteamento</h3>
        {routing.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            {routing.rules.map((rule) => (
              <Card
                key={rule.id}
                size="sm"
                className="flex-row items-center justify-between gap-3 px-4 py-2.5"
              >
                <p className="text-sm">
                  Se <strong>{FIELD_LABELS[rule.field]}</strong>{" "}
                  {OP_LABELS[rule.operator]}
                  {rule.value ? ` "${rule.value}"` : ""} →{" "}
                  <strong>{lookups.maps.users[rule.ownerId] ?? "—"}</strong>
                </p>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover regra"
                    onClick={async () => {
                      const r = await deleteRoutingRule(slug, rule.id);
                      if (r.ok) routing.refetch();
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                ) : null}
              </Card>
            ))}
            <p className="px-1 text-muted-foreground text-xs">
              Sem regra correspondente, o lead é distribuído por round-robin
              (membro com menos leads ativos).
            </p>
            {canManage ? (
              <RoutingRuleForm
                slug={slug}
                userOptions={lookups.options.users}
                onSaved={routing.refetch}
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function ConditionFields({
  field,
  setField,
  operator,
  setOperator,
  value,
  setValue,
}: {
  field: Field;
  setField: (f: Field) => void;
  operator: Operator;
  setOperator: (o: Operator) => void;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <>
      <Select value={field} onValueChange={(v) => setField(v as Field)}>
        <SelectTrigger size="sm" className="w-32">
          <span>{FIELD_LABELS[field]}</span>
        </SelectTrigger>
        <SelectContent>
          {LEAD_RULE_FIELDS.map((f) => (
            <SelectItem key={f} value={f}>
              {FIELD_LABELS[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={operator}
        onValueChange={(v) => setOperator(v as Operator)}
      >
        <SelectTrigger size="sm" className="w-36">
          <span>{OP_LABELS[operator]}</span>
        </SelectTrigger>
        <SelectContent>
          {LEAD_RULE_OPERATORS.map((o) => (
            <SelectItem key={o} value={o}>
              {OP_LABELS[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsValue(operator) ? (
        <Input
          value={value}
          placeholder="valor"
          className="h-8 w-28"
          onChange={(e) => setValue(e.target.value)}
        />
      ) : null}
    </>
  );
}

function ScoringRuleForm({
  slug,
  onSaved,
}: {
  slug: string;
  onSaved: () => void;
}) {
  const [field, setField] = useState<Field>("source");
  const [operator, setOperator] = useState<Operator>("equals");
  const [value, setValue] = useState("");
  const [points, setPoints] = useState("10");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const r = await createScoringRule(slug, {
      field,
      operator,
      value: needsValue(operator) ? value.trim() || undefined : undefined,
      points: Number(points) || 0,
      active: true,
    });
    setBusy(false);
    if (r.ok) {
      setValue("");
      onSaved();
    } else {
      toast.error(r.message ?? "Não foi possível criar a regra.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2.5">
      <ConditionFields
        field={field}
        setField={setField}
        operator={operator}
        setOperator={setOperator}
        value={value}
        setValue={setValue}
      />
      <Input
        type="number"
        value={points}
        className="h-8 w-20"
        aria-label="Pontos"
        onChange={(e) => setPoints(e.target.value)}
      />
      <span className="text-muted-foreground text-xs">pts</span>
      <Button size="sm" onClick={add} disabled={busy}>
        <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
        Adicionar
      </Button>
    </div>
  );
}

function RoutingRuleForm({
  slug,
  userOptions,
  onSaved,
}: {
  slug: string;
  userOptions: { value: string; label: string }[];
  onSaved: () => void;
}) {
  const [field, setField] = useState<Field>("source");
  const [operator, setOperator] = useState<Operator>("equals");
  const [value, setValue] = useState("");
  const [ownerId, setOwnerId] = useState(userOptions[0]?.value ?? "");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!ownerId) {
      toast.error("Escolha um responsável.");
      return;
    }
    setBusy(true);
    const r = await createRoutingRule(slug, {
      field,
      operator,
      value: needsValue(operator) ? value.trim() || undefined : undefined,
      ownerId,
      active: true,
    });
    setBusy(false);
    if (r.ok) {
      setValue("");
      onSaved();
    } else {
      toast.error(r.message ?? "Não foi possível criar a regra.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2.5">
      <ConditionFields
        field={field}
        setField={setField}
        operator={operator}
        setOperator={setOperator}
        value={value}
        setValue={setValue}
      />
      <span className="text-muted-foreground text-xs">→</span>
      <Select value={ownerId} onValueChange={(v) => setOwnerId(v ?? "")}>
        <SelectTrigger size="sm" className="w-36">
          <span className="truncate">
            {userOptions.find((u) => u.value === ownerId)?.label ??
              "Responsável"}
          </span>
        </SelectTrigger>
        <SelectContent>
          {userOptions.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={add} disabled={busy}>
        <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
        Adicionar
      </Button>
    </div>
  );
}
