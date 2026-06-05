import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBRL, getPlan, priceFor } from "@/src/config/plans";
import type {
  SubscriptionDTO,
  SubscriptionStatusValue,
} from "@/src/schemas/subscription.schema";

const STATUS_LABEL: Record<SubscriptionStatusValue, string> = {
  ACTIVE: "Ativo",
  TRIALING: "Em teste",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelado",
  INCOMPLETE: "Incompleto",
};

const STATUS_TONE: Record<SubscriptionStatusValue, string> = {
  ACTIVE: "bg-primary/10 text-primary",
  TRIALING: "bg-primary/10 text-primary",
  PAST_DUE: "bg-destructive/10 text-destructive",
  CANCELED: "bg-muted text-muted-foreground",
  INCOMPLETE: "bg-destructive/10 text-destructive",
};

function priceText(subscription: SubscriptionDTO): string {
  const price = priceFor(subscription.plan, subscription.cycle);
  if (price === null) return "Sob consulta";
  if (price === 0) return "Grátis";
  const period = subscription.cycle === "yearly" ? "/ano" : "/mês";
  return `${formatBRL(price)}${period}`;
}

export function PlanSummaryCard({
  slug,
  subscription,
}: {
  slug: string;
  subscription: SubscriptionDTO;
}) {
  const plan = getPlan(subscription.plan);
  const renewal = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
    : null;

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Plano atual</span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${STATUS_TONE[subscription.status]}`}
          >
            {STATUS_LABEL[subscription.status]}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="font-heading font-semibold text-xl tracking-tight">
            {plan.name}
          </h3>
          <span className="text-muted-foreground text-sm">
            {priceText(subscription)}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {plan.tagline}
          {renewal ? ` · Renova em ${renewal}` : ""}
        </p>
      </div>

      <Button
        variant="outline"
        render={<Link href={`/${slug}/billing/plans`} />}
      >
        Alterar plano
        <HugeiconsIcon icon={ArrowRight02Icon} />
      </Button>
    </Card>
  );
}
