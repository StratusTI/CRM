import { z } from "zod";

/**
 * Contratos da integração com o Instagram (sobre a conexão social já existente).
 * Três capacidades: ver o perfil (overview), analytics (insights da conta IG
 * Business/Creator) e postar (publicação de imagem com legenda). O Instagram
 * publica via API do Graph com fluxo de 2 passos (`/media` → `/media_publish`)
 * e exige imagem hospedada em URL pública — o service usa um blob route próprio
 * para servir a imagem temporariamente durante o publish.
 */

/** Visão do perfil: identidade + métricas atuais. */
export const InstagramProfileOverviewSchema = z.object({
  igAccountId: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  biography: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
  mediaCount: z.number().int().nonnegative(),
  followersCount: z.number().int().nonnegative(),
  followsCount: z.number().int().nonnegative(),
});

export type InstagramProfileOverview = z.infer<
  typeof InstagramProfileOverviewSchema
>;

/** Janelas de tempo aceitas pelos insights. O service traduz para datas. */
export const InstagramInsightsRangeSchema = z
  .enum(["7d", "28d", "90d"])
  .default("28d");

export type InstagramInsightsRange = z.infer<
  typeof InstagramInsightsRangeSchema
>;

/** Quantos dias cada janela representa (para montar o `since`). */
export const IG_INSIGHTS_RANGE_DAYS: Record<InstagramInsightsRange, number> = {
  "7d": 7,
  "28d": 28,
  "90d": 90,
};

/** Um ponto diário da série de insights. */
export const InstagramInsightsPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  impressions: z.number().int().nonnegative(),
  reach: z.number().int().nonnegative(),
  profileViews: z.number().int().nonnegative(),
});

export type InstagramInsightsPoint = z.infer<
  typeof InstagramInsightsPointSchema
>;

/** Insights: totais da janela + série diária. */
export const InstagramInsightsSchema = z.object({
  range: InstagramInsightsRangeSchema,
  startDate: z.string(),
  endDate: z.string(),
  totals: z.object({
    impressions: z.number().int().nonnegative(),
    reach: z.number().int().nonnegative(),
    profileViews: z.number().int().nonnegative(),
  }),
  series: z.array(InstagramInsightsPointSchema),
});

export type InstagramInsights = z.infer<typeof InstagramInsightsSchema>;

/**
 * Conteúdo da publicação. A imagem (obrigatória — o IG não publica sem mídia)
 * NÃO entra aqui — vem como `File` no `multipart/form-data` e é validada na
 * rota; este schema valida só a legenda. Limite de 2200 chars na API.
 */
export const PublishInstagramPostSchema = z.object({
  caption: z.string().trim().max(2200).default(""),
});

export type PublishInstagramPostInput = z.infer<
  typeof PublishInstagramPostSchema
>;

/** Resultado da publicação — id do post e link para abri-lo. */
export const PublishInstagramPostResultSchema = z.object({
  postId: z.string(),
  permalink: z.string().nullable(),
});

export type PublishInstagramPostResult = z.infer<
  typeof PublishInstagramPostResultSchema
>;
