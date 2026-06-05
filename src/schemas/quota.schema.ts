import { z } from "zod";

/** Contrato da feature Quota (metas de receita por responsável e período). */

export const QUOTA_PERIODS = ["MONTH", "QUARTER"] as const;

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const QUARTER_KEY = /^\d{4}-Q[1-4]$/;

const PeriodSchema = z.enum(QUOTA_PERIODS);
const PeriodKeySchema = z.string().trim().min(1, "Período inválido");
const OwnerIdSchema = z.string().trim().min(1, "Responsável inválido");
const TargetAmountSchema = z
  .number("Meta inválida")
  .nonnegative("Meta não pode ser negativa")
  .max(1_000_000_000_000, "Meta fora do limite");

/** `periodKey` deve casar com o formato do `period` (mês AAAA-MM ou trimestre AAAA-Qn). */
function matchesPeriod(period: (typeof QUOTA_PERIODS)[number], key: string) {
  return period === "MONTH" ? MONTH_KEY.test(key) : QUARTER_KEY.test(key);
}

export const CreateQuotaSchema = z
  .object({
    ownerId: OwnerIdSchema,
    period: PeriodSchema,
    periodKey: PeriodKeySchema,
    targetAmount: TargetAmountSchema,
  })
  .refine((d) => matchesPeriod(d.period, d.periodKey), {
    message: "Período e chave do período não correspondem",
    path: ["periodKey"],
  });

export const UpdateQuotaSchema = z.object({
  targetAmount: TargetAmountSchema,
});

export const QuotaOutputSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  period: PeriodSchema,
  periodKey: z.string(),
  targetAmount: z.number(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateQuotaInput = z.infer<typeof CreateQuotaSchema>;
export type UpdateQuotaInput = z.infer<typeof UpdateQuotaSchema>;
export type QuotaDTO = z.infer<typeof QuotaOutputSchema>;
