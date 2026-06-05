"use client";

import {
  Building06Icon,
  SparklesIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import {
  type BillingCycle,
  formatBRL,
  PLAN_LIST,
  type PlanDefinition,
  type PlanId,
  priceFor,
  recommendPlanForSeats,
} from "@/src/config/plans";
import type { SubscriptionDTO } from "@/src/schemas/subscription.schema";

const SEATS_MIN = 1;
const SEATS_MAX = 60;

/** Texto do preço por ciclo (sempre exibido como valor mensal equivalente). */
function priceLabel(plan: PlanDefinition, cycle: BillingCycle) {
  if (plan.cta === "contact") return { value: "Sob consulta", sub: "" };
  const monthly = priceFor(plan.id, "monthly") ?? 0;
  if (monthly === 0) return { value: "Grátis", sub: "para sempre" };
  if (cycle === "yearly") {
    const yearly = priceFor(plan.id, "yearly") ?? 0;
    return {
      value: `${formatBRL(Math.round(yearly / 12))}/mês`,
      sub: `${formatBRL(yearly)} cobrados por ano`,
    };
  }
  return { value: `${formatBRL(monthly)}/mês`, sub: "cobrança mensal" };
}

function PlanCard({
  plan,
  cycle,
  isCurrent,
  isRecommended,
  saving,
  onSelect,
}: {
  plan: PlanDefinition;
  cycle: BillingCycle;
  isCurrent: boolean;
  isRecommended: boolean;
  saving: boolean;
  onSelect: (plan: PlanId) => void;
}) {
  const price = priceLabel(plan, cycle);

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-5 transition-all",
        isRecommended && "border-primary shadow-md ring-1 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="font-heading font-semibold text-base tracking-tight">
            {plan.name}
          </h3>
          <p className="text-muted-foreground text-xs">{plan.tagline}</p>
        </div>
        {isRecommended ? (
          <Badge className="shrink-0">
            <HugeiconsIcon icon={SparklesIcon} />
            Recomendado
          </Badge>
        ) : plan.badge ? (
          <Badge variant="secondary" className="shrink-0">
            {plan.badge}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-0.5">
        <div className="font-heading font-semibold text-2xl tracking-tight">
          {price.value}
        </div>
        {price.sub ? (
          <div className="text-muted-foreground text-xs">{price.sub}</div>
        ) : null}
      </div>

      {plan.cta === "contact" ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href =
              "mailto:vendas@example.com?subject=Plano%20Enterprise";
          }}
        >
          <HugeiconsIcon icon={Building06Icon} />
          Falar com vendas
        </Button>
      ) : isCurrent ? (
        <Button variant="outline" className="w-full" disabled>
          Plano atual
        </Button>
      ) : (
        <Button
          variant={isRecommended ? "default" : "outline"}
          className="w-full"
          disabled={saving}
          onClick={() => onSelect(plan.id)}
        >
          {plan.cta === "free" ? "Mudar para Free" : `Assinar ${plan.name}`}
        </Button>
      )}

      <ul className="space-y-2 text-sm">
        {plan.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <HugeiconsIcon
              icon={Tick02Icon}
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <span className="text-muted-foreground">{h}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PlanSelection({
  slug,
  current,
}: {
  slug: string;
  current: SubscriptionDTO;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>(current.cycle);
  const [seats, setSeats] = useState<number>(
    Math.min(Math.max(current.seats, SEATS_MIN), SEATS_MAX),
  );
  const [saving, setSaving] = useState<PlanId | null>(null);

  // No topo do slider (60+) a equipe é grande demais para os planos cobráveis:
  // recomendamos o Enterprise (sob consulta).
  const atMax = seats >= SEATS_MAX;
  const recommended: PlanId = atMax
    ? "enterprise"
    : recommendPlanForSeats(seats);

  async function selectPlan(plan: PlanId) {
    setSaving(plan);
    try {
      const res = await fetch(apiUrl(`/api/workspaces/${slug}/subscription`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle, seats }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Não foi possível alterar o plano.");
        return;
      }
      toast.success("Plano atualizado com sucesso.");
      router.refresh();
    } catch {
      toast.error("Falha de rede ao alterar o plano.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Alternância de ciclo */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              cycle === "monthly"
                ? "bg-background shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              cycle === "yearly"
                ? "bg-background shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Anual
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Slider de dimensionamento por equipe */}
      <Card className="space-y-4 p-5">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Tamanho da sua equipe</h3>
            <p className="text-muted-foreground text-xs">
              Arraste para ver o plano ideal para o número de pessoas.
            </p>
          </div>
          <div className="text-right">
            <div className="font-heading font-semibold text-2xl tracking-tight tabular-nums">
              {seats}
              {seats >= SEATS_MAX ? "+" : ""}
            </div>
            <div className="text-muted-foreground text-xs">
              {seats === 1 ? "pessoa" : "pessoas"}
            </div>
          </div>
        </div>
        <Slider
          value={seats}
          onValueChange={(v) => setSeats(Array.isArray(v) ? v[0] : v)}
          min={SEATS_MIN}
          max={SEATS_MAX}
          step={1}
          aria-label="Número de pessoas na equipe"
        />
        <p className="text-muted-foreground text-xs">
          Plano sugerido:{" "}
          <span className="font-medium text-foreground">
            {PLAN_LIST.find((p) => p.id === recommended)?.name}
          </span>
          {atMax
            ? " — para equipes maiores, fale com vendas para um plano sob medida."
            : ""}
        </p>
      </Card>

      {/* Cards de planos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_LIST.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            isCurrent={plan.id === current.plan}
            isRecommended={plan.id === recommended}
            saving={saving === plan.id}
            onSelect={selectPlan}
          />
        ))}
      </div>
    </div>
  );
}
