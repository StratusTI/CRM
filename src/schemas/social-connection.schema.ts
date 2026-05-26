import { z } from "zod";

/**
 * Contrato da feature SocialConnection — a conta de rede social da empresa
 * conectada a uma workspace via OAuth. A entrada do recurso é o próprio fluxo
 * OAuth (não há body de criação); o que expomos é a lista de conexões e o
 * status de cada plataforma. Tokens NUNCA fazem parte do DTO.
 */

/** Plataformas suportadas — espelha o enum `SocialPlatform` do Prisma. */
export const SocialPlatformSchema = z.enum([
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE",
  "GOOGLE_ANALYTICS",
]);

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

/** Lista canônica das plataformas, para iterar no frontend/registry. */
export const SOCIAL_PLATFORMS = SocialPlatformSchema.options;

/** Nome legível da plataforma (legenda de gráfico, opções de UI). */
export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  GOOGLE_ANALYTICS: "Google Analytics",
};

/** Enum → slug minúsculo usado nas rotas/URLs (ex.: "INSTAGRAM" → "instagram"). */
export function platformToSlug(platform: SocialPlatform): string {
  return platform.toLowerCase();
}

/** Slug de rota → enum, ou `null` se desconhecido (ex.: "instagram" → "INSTAGRAM"). */
export function parsePlatformSlug(slug: string): SocialPlatform | null {
  const parsed = SocialPlatformSchema.safeParse(slug.toUpperCase());
  return parsed.success ? parsed.data : null;
}

/** Estado de uma conexão — espelha o enum `SocialConnectionStatus` do Prisma. */
export const SocialConnectionStatusSchema = z.enum([
  "CONNECTED",
  "EXPIRED",
  "REVOKED",
]);

export type SocialConnectionStatus = z.infer<
  typeof SocialConnectionStatusSchema
>;

/** Saída pública de uma conexão (sem access/refresh token). */
export const SocialConnectionOutputSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  platform: SocialPlatformSchema,
  accountName: z.string().nullable(),
  externalAccountId: z.string(),
  scope: z.string().nullable(),
  status: SocialConnectionStatusSchema,
  expiresAt: z.string().nullable(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SocialConnectionDTO = z.infer<typeof SocialConnectionOutputSchema>;
