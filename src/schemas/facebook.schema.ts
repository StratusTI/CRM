import { z } from "zod";

/**
 * Contratos da integração com o Facebook (sobre a conexão social já existente).
 * Três capacidades: ver a Página (overview), analytics (insights da Página) e
 * postar (publicação de texto/link/imagem). O Facebook publica numa **Página**,
 * não no perfil — a conexão guarda o id e o token da Página (ver provider).
 */

/** Visão da Página: identidade + métricas atuais. */
export const FacebookPageOverviewSchema = z.object({
  pageId: z.string(),
  name: z.string(),
  about: z.string().nullable(),
  link: z.string().nullable(),
  pictureUrl: z.string().nullable(),
  fanCount: z.number().int().nonnegative(),
  followersCount: z.number().int().nonnegative(),
});

export type FacebookPageOverview = z.infer<typeof FacebookPageOverviewSchema>;

/** Janelas de tempo aceitas pelos insights. O service traduz para datas. */
export const FacebookInsightsRangeSchema = z
  .enum(["7d", "28d", "90d"])
  .default("28d");

export type FacebookInsightsRange = z.infer<typeof FacebookInsightsRangeSchema>;

/** Quantos dias cada janela representa (para montar o `since`). */
export const FB_INSIGHTS_RANGE_DAYS: Record<FacebookInsightsRange, number> = {
  "7d": 7,
  "28d": 28,
  "90d": 90,
};

/** Um ponto diário da série de insights da Página. */
export const FacebookInsightsPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  impressions: z.number().int().nonnegative(),
  engagements: z.number().int().nonnegative(),
  fanAdds: z.number().int(),
});

export type FacebookInsightsPoint = z.infer<typeof FacebookInsightsPointSchema>;

/** Insights: totais da janela + série diária. */
export const FacebookInsightsSchema = z.object({
  range: FacebookInsightsRangeSchema,
  startDate: z.string(),
  endDate: z.string(),
  totals: z.object({
    impressions: z.number().int().nonnegative(),
    engagements: z.number().int().nonnegative(),
    fanAdds: z.number().int(),
  }),
  series: z.array(FacebookInsightsPointSchema),
});

export type FacebookInsights = z.infer<typeof FacebookInsightsSchema>;

/**
 * Conteúdo da publicação. A imagem (opcional) NÃO entra aqui — vem como `File`
 * no `multipart/form-data`; este schema valida só os campos de texto. Exigimos
 * mensagem OU link (uma publicação vazia não faz sentido); a imagem é validada
 * na rota. `link` e `message` convivem (link com texto de chamada).
 */
export const PublishPostSchema = z
  .object({
    message: z.string().trim().max(5000).default(""),
    link: z.url("Link inválido").nullable().default(null),
  })
  .refine((v) => v.message.length > 0 || v.link !== null, {
    message: "Informe uma mensagem ou um link",
    path: ["message"],
  });

export type PublishPostInput = z.infer<typeof PublishPostSchema>;

/** Resultado da publicação — id do post e link para abri-lo. */
export const PublishPostResultSchema = z.object({
  postId: z.string(),
  url: z.string(),
});

export type PublishPostResult = z.infer<typeof PublishPostResultSchema>;
