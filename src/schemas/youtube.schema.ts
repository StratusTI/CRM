import { z } from "zod";

/**
 * Contratos da integração com o YouTube (sobre a conexão social já existente).
 * Há três capacidades: ver a conta (overview), analytics (resumo + série
 * temporal) e postar (upload de vídeo). Tokens nunca aparecem nestes contratos
 * — eles vivem na `SocialConnection` cifrada e são resolvidos no service.
 */

/** Visão da conta: identidade do canal + estatísticas agregadas (Data API). */
export const YoutubeChannelOverviewSchema = z.object({
  channelId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  customUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  subscriberCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative(),
  videoCount: z.number().int().nonnegative(),
});

export type YoutubeChannelOverview = z.infer<
  typeof YoutubeChannelOverviewSchema
>;

/** Janelas de tempo aceitas pelo analytics. O service traduz para datas. */
export const YoutubeInsightsRangeSchema = z
  .enum(["7d", "28d", "90d", "365d"])
  .default("28d");

export type YoutubeInsightsRange = z.infer<typeof YoutubeInsightsRangeSchema>;

/** Quantos dias cada janela representa (usado para montar o `startDate`). */
export const INSIGHTS_RANGE_DAYS: Record<YoutubeInsightsRange, number> = {
  "7d": 7,
  "28d": 28,
  "90d": 90,
  "365d": 365,
};

/** Um ponto diário da série temporal de métricas. */
export const YoutubeInsightsPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  views: z.number().int().nonnegative(),
  estimatedMinutesWatched: z.number().int().nonnegative(),
  subscribersGained: z.number().int(),
});

export type YoutubeInsightsPoint = z.infer<typeof YoutubeInsightsPointSchema>;

/** Analytics: totais da janela + série diária (YouTube Analytics API). */
export const YoutubeInsightsSchema = z.object({
  range: YoutubeInsightsRangeSchema,
  startDate: z.string(),
  endDate: z.string(),
  totals: z.object({
    views: z.number().int().nonnegative(),
    estimatedMinutesWatched: z.number().int().nonnegative(),
    subscribersGained: z.number().int(),
  }),
  series: z.array(YoutubeInsightsPointSchema),
});

export type YoutubeInsights = z.infer<typeof YoutubeInsightsSchema>;

/** Visibilidade do vídeo enviado. Default conservador: privado. */
export const YoutubePrivacySchema = z
  .enum(["private", "unlisted", "public"])
  .default("private");

export type YoutubePrivacy = z.infer<typeof YoutubePrivacySchema>;

/**
 * Metadados do upload. O arquivo em si NÃO entra aqui — vem como `File` no
 * `multipart/form-data`; este schema valida só os campos de texto do form.
 */
export const PublishVideoSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(100),
  description: z.string().max(5000).default(""),
  privacyStatus: YoutubePrivacySchema,
  tags: z.array(z.string().trim().min(1)).max(30).default([]),
});

export type PublishVideoInput = z.infer<typeof PublishVideoSchema>;

/** Resultado do upload — o suficiente para linkar e exibir na UI. */
export const PublishVideoResultSchema = z.object({
  videoId: z.string(),
  url: z.string(),
  title: z.string(),
  privacyStatus: YoutubePrivacySchema,
});

export type PublishVideoResult = z.infer<typeof PublishVideoResultSchema>;
