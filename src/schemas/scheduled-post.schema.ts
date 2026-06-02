import { z } from "zod";
import {
  type SocialPlatform,
  SocialPlatformSchema,
} from "@/src/schemas/social-connection.schema";
import { TiktokPrivacySchema } from "@/src/schemas/tiktok.schema";
import { YoutubePrivacySchema } from "@/src/schemas/youtube.schema";

/**
 * Contrato da feature de agendamento de posts. Um post tem um texto
 * compartilhado e N alvos (plataformas), publicados "agora" ou no horário
 * agendado pelo cron. A entrada de criação chega como `multipart/form-data`
 * (mídia + campos); este schema valida os campos de texto/JSON — os arquivos
 * são validados na rota. Tokens/mídia binária nunca entram no DTO.
 */

/** Plataformas que suportam publicação (subconjunto de SocialPlatform). */
export const PUBLISHABLE_PLATFORMS = [
  "INSTAGRAM",
  "FACEBOOK",
  "TWITTER",
  "LINKEDIN",
  "TIKTOK",
  "YOUTUBE",
] as const satisfies readonly SocialPlatform[];

export const PublishablePlatformSchema = z.enum(PUBLISHABLE_PLATFORMS);
export type PublishablePlatform = z.infer<typeof PublishablePlatformSchema>;

/** Requisito de mídia de cada plataforma — usado na validação e na UI. */
export const PLATFORM_MEDIA_REQUIREMENT: Record<
  PublishablePlatform,
  "image" | "video" | "optional"
> = {
  INSTAGRAM: "image",
  FACEBOOK: "optional",
  TWITTER: "optional",
  LINKEDIN: "optional",
  TIKTOK: "video",
  YOUTUBE: "video",
};

/** Limite de caracteres do texto por plataforma (o menor vira o teto da UI). */
export const PLATFORM_TEXT_LIMIT: Record<PublishablePlatform, number> = {
  INSTAGRAM: 2200,
  FACEBOOK: 5000,
  TWITTER: 280,
  LINKEDIN: 3000,
  TIKTOK: 2200,
  YOUTUBE: 5000,
};

/** Opções específicas por plataforma — persistidas em `ScheduledPost.options`. */
export const ScheduledPostOptionsSchema = z
  .object({
    youtube: z
      .object({
        privacy: YoutubePrivacySchema.default("public"),
        tags: z.array(z.string().trim().min(1)).max(30).default([]),
      })
      .optional(),
    tiktok: z
      .object({
        privacy: TiktokPrivacySchema.default("SELF_ONLY"),
        disableComment: z.boolean().default(false),
        disableDuet: z.boolean().default(false),
        disableStitch: z.boolean().default(false),
      })
      .optional(),
    facebook: z
      .object({
        link: z.url().nullable().default(null),
      })
      .optional(),
  })
  .default({});

export type ScheduledPostOptions = z.infer<typeof ScheduledPostOptionsSchema>;

/** Modo de publicação escolhido pelo usuário. */
export const PublishModeSchema = z.enum(["now", "schedule"]);
export type PublishMode = z.infer<typeof PublishModeSchema>;

/**
 * Campos de criação (sem os arquivos). `scheduledFor` é exigido quando
 * `mode = "schedule"` e precisa estar no futuro. `content` pode ficar vazio
 * desde que a plataforma aceite (ex.: só vídeo no YouTube) — a regra final por
 * plataforma é aplicada no service após conhecer a mídia.
 */
export const CreateScheduledPostInputSchema = z
  .object({
    platforms: z
      .array(PublishablePlatformSchema)
      .min(1, "Selecione ao menos uma plataforma"),
    content: z.string().trim().max(5000).default(""),
    title: z.string().trim().max(100).optional(),
    mode: PublishModeSchema,
    scheduledFor: z.string().datetime().optional(),
    options: ScheduledPostOptionsSchema,
  })
  .refine((v) => v.mode === "now" || Boolean(v.scheduledFor), {
    message: "Informe a data e hora do agendamento",
    path: ["scheduledFor"],
  })
  .refine(
    (v) =>
      v.mode === "now" ||
      !v.scheduledFor ||
      new Date(v.scheduledFor).getTime() > Date.now(),
    {
      message: "A data do agendamento deve estar no futuro",
      path: ["scheduledFor"],
    },
  );

export type CreateScheduledPostInput = z.infer<
  typeof CreateScheduledPostInputSchema
>;

/* ----------------------------------- DTOs ---------------------------------- */

export const ScheduledPostStatusSchema = z.enum([
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "PARTIALLY_FAILED",
  "FAILED",
  "CANCELED",
]);
export type ScheduledPostStatus = z.infer<typeof ScheduledPostStatusSchema>;

export const ScheduledPostTargetStatusSchema = z.enum([
  "PENDING",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELED",
]);
export type ScheduledPostTargetStatus = z.infer<
  typeof ScheduledPostTargetStatusSchema
>;

export const ScheduledMediaKindSchema = z.enum(["IMAGE", "VIDEO"]);
export type ScheduledMediaKind = z.infer<typeof ScheduledMediaKindSchema>;

export const ScheduledPostTargetDTOSchema = z.object({
  id: z.string(),
  platform: SocialPlatformSchema,
  status: ScheduledPostTargetStatusSchema,
  externalPostId: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number(),
  publishedAt: z.string().nullable(),
});
export type ScheduledPostTargetDTO = z.infer<
  typeof ScheduledPostTargetDTOSchema
>;

export const ScheduledPostMediaDTOSchema = z.object({
  id: z.string(),
  kind: ScheduledMediaKindSchema,
  contentType: z.string(),
  sizeBytes: z.number(),
  order: z.number(),
});
export type ScheduledPostMediaDTO = z.infer<typeof ScheduledPostMediaDTOSchema>;

export const ScheduledPostDTOSchema = z.object({
  id: z.string(),
  content: z.string(),
  title: z.string().nullable(),
  status: ScheduledPostStatusSchema,
  scheduledFor: z.string(),
  publishedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  targets: z.array(ScheduledPostTargetDTOSchema),
  media: z.array(ScheduledPostMediaDTOSchema),
});
export type ScheduledPostDTO = z.infer<typeof ScheduledPostDTOSchema>;

/** Body do reagendamento (PATCH) — apenas a nova data/hora. */
export const RescheduleInputSchema = z.object({
  scheduledFor: z
    .string()
    .datetime()
    .refine((v) => new Date(v).getTime() > Date.now(), {
      message: "A data do agendamento deve estar no futuro",
    }),
});
export type RescheduleInput = z.infer<typeof RescheduleInputSchema>;
