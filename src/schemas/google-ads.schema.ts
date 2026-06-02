import { z } from "zod";

/**
 * Contratos da integração com o Google Ads (via Google Ads API REST v18).
 * Reusa credenciais GOOGLE_CLIENT_ID/SECRET + GOOGLE_ADS_DEVELOPER_TOKEN.
 * O overview exibe totais da conta; insights mostra a série diária de campanhas.
 */

/** Visão geral da conta: totais do período padrão (últimos 30d). */
export const GoogleAdsOverviewSchema = z.object({
  customerId: z.string(),
  customerName: z.string().nullable(),
  currency: z.string(),
  totals: z.object({
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    costMicros: z.number().nonnegative(),
    conversions: z.number().nonnegative(),
    ctr: z.number().nonnegative(),
  }),
  activeCampaigns: z.number().int().nonnegative(),
});

export type GoogleAdsOverview = z.infer<typeof GoogleAdsOverviewSchema>;

/** Janelas de tempo aceitas. */
export const GoogleAdsInsightsRangeSchema = z
  .enum(["7d", "30d", "90d"])
  .default("30d");

export type GoogleAdsInsightsRange = z.infer<typeof GoogleAdsInsightsRangeSchema>;

export const GOOGLE_ADS_RANGE_DAYS: Record<GoogleAdsInsightsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Um ponto diário da série temporal de campanhas. */
export const GoogleAdsInsightsPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  costMicros: z.number().nonnegative(),
  conversions: z.number().nonnegative(),
});

export type GoogleAdsInsightsPoint = z.infer<typeof GoogleAdsInsightsPointSchema>;

/** Insights: totais do período + série diária. */
export const GoogleAdsInsightsSchema = z.object({
  range: GoogleAdsInsightsRangeSchema,
  startDate: z.string(),
  endDate: z.string(),
  totals: z.object({
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    costMicros: z.number().nonnegative(),
    conversions: z.number().nonnegative(),
  }),
  series: z.array(GoogleAdsInsightsPointSchema),
});

export type GoogleAdsInsights = z.infer<typeof GoogleAdsInsightsSchema>;
