import { z } from "zod";
import { BillingCycleSchema, PlanIdSchema } from "@/src/config/plans";

/** Contrato da feature Assinatura (plano da workspace). */

export const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "CANCELED",
  "INCOMPLETE",
] as const;

export const SubscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

/** Entrada de troca de plano (somente owner). */
export const ChangePlanSchema = z.object({
  plan: PlanIdSchema,
  cycle: BillingCycleSchema.default("monthly"),
  /** Assentos desejados (dimensionados pelo slider na UI). */
  seats: z.number().int().min(1).max(100_000).optional(),
});

export const SubscriptionOutputSchema = z.object({
  plan: PlanIdSchema,
  cycle: BillingCycleSchema,
  status: SubscriptionStatusSchema,
  seats: z.number().int(),
  cancelAtPeriodEnd: z.boolean(),
  currentPeriodEnd: z.string().nullable(),
});

export type SubscriptionStatusValue = (typeof SUBSCRIPTION_STATUSES)[number];
export type ChangePlanInput = z.infer<typeof ChangePlanSchema>;
export type SubscriptionDTO = z.infer<typeof SubscriptionOutputSchema>;
