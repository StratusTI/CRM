import type { Subscription } from "@prisma/client";
import {
  type BillingCycle,
  BillingCycleSchema,
  type PlanId,
  PlanIdSchema,
} from "@/src/config/plans";
import type { SubscriptionDTO } from "@/src/schemas/subscription.schema";

/** Plano efetivo: `free` quando o valor salvo não está no catálogo atual. */
function resolvePlan(value: string): PlanId {
  const parsed = PlanIdSchema.safeParse(value);
  return parsed.success ? parsed.data : "free";
}

function resolveCycle(value: string): BillingCycle {
  const parsed = BillingCycleSchema.safeParse(value);
  return parsed.success ? parsed.data : "monthly";
}

/** DTO padrão de uma workspace sem registro de assinatura (plano Free). */
export const FREE_SUBSCRIPTION_DTO: SubscriptionDTO = {
  plan: "free",
  cycle: "monthly",
  status: "ACTIVE",
  seats: 1,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
};

export function toSubscriptionDTO(sub: Subscription | null): SubscriptionDTO {
  if (!sub) return FREE_SUBSCRIPTION_DTO;
  return {
    plan: resolvePlan(sub.plan),
    cycle: resolveCycle(sub.cycle),
    status: sub.status,
    seats: sub.seats,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd
      ? sub.currentPeriodEnd.toISOString()
      : null,
  };
}
