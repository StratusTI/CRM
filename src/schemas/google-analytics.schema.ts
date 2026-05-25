import { z } from "zod";

/**
 * Contratos da integração com o Google Analytics 4 (sobre a conexão social já
 * existente). Há duas capacidades: ver a conta/propriedade (overview) e
 * analytics (resumo + série temporal). GA não posta — é read-only. Tokens nunca
 * aparecem nestes contratos — eles vivem na `SocialConnection` cifrada e são
 * resolvidos no service.
 */

/** Visão da propriedade GA4 conectada: identidade + métricas dos últimos 28d. */
export const GoogleAnalyticsOverviewSchema = z.object({
  propertyId: z.string(), // "properties/<id>"
  propertyName: z.string(),
  accountName: z.string().nullable(),
  /** Totais da janela padrão (28d) — só para o cartão do overview. */
  totals: z.object({
    activeUsers: z.number().int().nonnegative(),
    sessions: z.number().int().nonnegative(),
    screenPageViews: z.number().int().nonnegative(),
    eventCount: z.number().int().nonnegative(),
  }),
});

export type GoogleAnalyticsOverview = z.infer<
  typeof GoogleAnalyticsOverviewSchema
>;

/** Janelas de tempo aceitas pelo analytics. O service traduz para datas. */
export const GoogleAnalyticsInsightsRangeSchema = z
  .enum(["7d", "28d", "90d"])
  .default("28d");

export type GoogleAnalyticsInsightsRange = z.infer<
  typeof GoogleAnalyticsInsightsRangeSchema
>;

/** Quantos dias cada janela representa (usado para montar o `startDate`). */
export const INSIGHTS_RANGE_DAYS: Record<GoogleAnalyticsInsightsRange, number> =
  {
    "7d": 7,
    "28d": 28,
    "90d": 90,
  };

/** Um ponto diário da série temporal. */
export const GoogleAnalyticsInsightsPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  activeUsers: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  screenPageViews: z.number().int().nonnegative(),
});

export type GoogleAnalyticsInsightsPoint = z.infer<
  typeof GoogleAnalyticsInsightsPointSchema
>;

/** Analytics: totais da janela + série diária. */
export const GoogleAnalyticsInsightsSchema = z.object({
  range: GoogleAnalyticsInsightsRangeSchema,
  startDate: z.string(),
  endDate: z.string(),
  totals: z.object({
    activeUsers: z.number().int().nonnegative(),
    sessions: z.number().int().nonnegative(),
    screenPageViews: z.number().int().nonnegative(),
    eventCount: z.number().int().nonnegative(),
  }),
  series: z.array(GoogleAnalyticsInsightsPointSchema),
});

export type GoogleAnalyticsInsights = z.infer<
  typeof GoogleAnalyticsInsightsSchema
>;
