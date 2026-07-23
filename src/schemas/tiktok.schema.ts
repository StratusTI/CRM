import { z } from "zod";

/**
 * Contratos da integração com o TikTok (sobre a conexão social já existente).
 * Três capacidades: ver o criador (overview), vídeos recentes com métricas
 * (Display API) e publicar (Content Posting API). Diferente de YouTube/Facebook,
 * o TikTok não expõe série temporal de insights para contas pessoais — o análogo
 * é a lista de vídeos recentes com estatísticas por vídeo. Tokens nunca aparecem
 * nestes contratos — vivem na `SocialConnection` cifrada e são resolvidos no
 * service.
 */

/** Visão do criador: identidade + estatísticas agregadas (Display API). */
export const TiktokCreatorOverviewSchema = z.object({
  openId: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  profileLink: z.string().nullable(),
  isVerified: z.boolean(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  likesCount: z.number().int().nonnegative(),
  videoCount: z.number().int().nonnegative(),
});

export type TiktokCreatorOverview = z.infer<typeof TiktokCreatorOverviewSchema>;

/** Um vídeo recente com métricas por vídeo (Display API `video/list`). */
export const TiktokVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  coverImageUrl: z.string().nullable(),
  shareUrl: z.string().nullable(),
  duration: z.number().int().nonnegative(),
  createdAt: z.string(), // ISO 8601, ou "" quando ausente
  viewCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative(),
});

export type TiktokVideo = z.infer<typeof TiktokVideoSchema>;

/** Vídeos recentes: totais agregados + a lista. */
export const TiktokVideosSchema = z.object({
  totals: z.object({
    views: z.number().int().nonnegative(),
    likes: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(),
  }),
  videos: z.array(TiktokVideoSchema),
});

export type TiktokVideos = z.infer<typeof TiktokVideosSchema>;

/** Vídeo recente + score de engajamento (curtidas + comentários + compart.). */
export const TiktokVideoEngagementSchema = TiktokVideoSchema.extend({
  engagementScore: z.number().nonnegative(),
});

export type TiktokVideoEngagement = z.infer<typeof TiktokVideoEngagementSchema>;

/**
 * Resumo semanal: views (7d) + top 5 vídeos mais quentes. Sem `saves`/`visitas
 * ao perfil` — a API pública do TikTok não expõe essas métricas.
 */
export const TiktokWeeklyEngagementSchema = z.object({
  views7d: z.number().int().nonnegative(),
  top5: z.array(TiktokVideoEngagementSchema).max(5),
});

export type TiktokWeeklyEngagement = z.infer<
  typeof TiktokWeeklyEngagementSchema
>;

/**
 * Nível de privacidade do post. Default conservador: SELF_ONLY (privado) — é o
 * único permitido enquanto o app não passa pela auditoria da TikTok. Os demais
 * valores espelham os níveis da Content Posting API; o provedor recusa os não
 * liberados, o que vira erro na publicação.
 */
export const TiktokPrivacySchema = z
  .enum([
    "SELF_ONLY",
    "FOLLOWER_OF_CREATOR",
    "MUTUAL_FOLLOW_FRIENDS",
    "PUBLIC_TO_EVERYONE",
  ])
  .default("SELF_ONLY");

export type TiktokPrivacy = z.infer<typeof TiktokPrivacySchema>;

/**
 * Metadados da publicação. O arquivo em si NÃO entra aqui — vem como `File` no
 * `multipart/form-data`; este schema valida só os campos de texto do form.
 */
export const PublishTiktokVideoSchema = z.object({
  title: z.string().trim().max(2200).default(""),
  privacyLevel: TiktokPrivacySchema,
  disableComment: z.boolean().default(false),
  disableDuet: z.boolean().default(false),
  disableStitch: z.boolean().default(false),
});

export type PublishTiktokVideoInput = z.infer<typeof PublishTiktokVideoSchema>;

/**
 * Resultado da publicação. A TikTok processa o vídeo de forma assíncrona, então
 * devolvemos o `publishId` (para rastrear) e o status corrente da publicação.
 */
export const PublishTiktokVideoResultSchema = z.object({
  publishId: z.string(),
  status: z.string(),
});

export type PublishTiktokVideoResult = z.infer<
  typeof PublishTiktokVideoResultSchema
>;
