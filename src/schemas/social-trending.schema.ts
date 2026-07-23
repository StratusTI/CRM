import { z } from "zod";
import { SocialPlatformSchema } from "@/src/schemas/social-connection.schema";

/**
 * "Em Alta": ranking dos posts de hoje (contas conectadas) por velocidade de
 * engajamento — quanto mais views/interações em menos tempo, mais em alta.
 * `views`/`saved` ficam `null` quando a plataforma não expõe a métrica (ex.:
 * Instagram não tem "views" por post nem TikTok expõe "saves").
 */
export const TrendingItemSchema = z.object({
  id: z.string(),
  platform: SocialPlatformSchema,
  thumbnailUrl: z.string().nullable(),
  caption: z.string().nullable(),
  permalink: z.string().nullable(),
  postedAt: z.string(),
  views: z.number().int().nonnegative().nullable(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative().nullable(),
  saved: z.number().int().nonnegative().nullable(),
  /** (views + interações) / horas desde a publicação. */
  score: z.number().nonnegative(),
});

export type TrendingItem = z.infer<typeof TrendingItemSchema>;
