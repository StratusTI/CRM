import { z } from "zod";

/**
 * Contrato da feature Landing Pages (construtor com IA, estilo Lovable/v0).
 *
 * Uma LandingPage é um documento HTML autocontido (Tailwind via CDN), gerado e
 * editado por IA, escopado por workspace. `status` = DRAFT/PUBLISHED é o botão
 * online/offline: quando PUBLISHED, o `slug` legível serve a página pública
 * (sem auth) em `/<workspace>/pages/<slug>`. O slug é único por workspace.
 *
 * As métricas de acesso vêm de LandingPageView (1 linha por sessão de visita),
 * upsertada por `viewId`. O IP do visitante nunca é guardado cru — só um hash
 * salgado, para contar visitantes únicos sem expor o endereço (LGPD). Cada
 * visita acumula `ctaClicks` (cliques em botões de conversão) e a `referrer`
 * (origem do tráfego).
 */

export const LANDING_PAGE_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type LandingPageStatus = (typeof LANDING_PAGE_STATUSES)[number];

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Informe o título da página")
  .max(300, "Título muito longo");

/** Slug legível: minúsculas, números e hífens. Único por workspace. */
export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o slug da página")
  .max(120, "Slug muito longo")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras, números e hífens");

/** Documento HTML autocontido gerado pela IA. Validado na fronteira. */
const HtmlSchema = z.string().max(1_000_000, "Documento muito grande");

export const CreateLandingPageSchema = z.object({
  title: TitleSchema,
  html: HtmlSchema.optional(),
});

/**
 * Atualização parcial. `status` alterna online/offline; `html` é salvo pelo
 * fluxo de geração da IA; `slug` pode ser editado (validado por unicidade no
 * service). Nenhum campo pode ser nulificado.
 */
export const UpdateLandingPageSchema = z
  .object({
    title: TitleSchema,
    slug: SlugSchema,
    html: HtmlSchema,
    status: z.enum(LANDING_PAGE_STATUSES),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

/** Mensagem do usuário para o construtor de IA. */
export const GenerateLandingPageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Mensagem vazia")
    .max(4000, "Mensagem muito longa"),
});

/**
 * Ingestão pública de evento de acesso. O IP é derivado do request no servidor
 * — NUNCA do corpo. `viewId` é o id de sessão gerado no cliente (mesma visita ⇒
 * mesmo upsert). `ctaClicks` é o total acumulado de cliques em CTA na visita.
 */
export const RecordLandingEventSchema = z.object({
  viewId: z.string().trim().min(8).max(64),
  /** Tempo de permanência acumulado (ms). Cap de 24h evita lixo. */
  durationMs: z.number().int().min(0).max(86_400_000).default(0),
  /** Cliques acumulados em botões de conversão na visita. */
  ctaClicks: z.number().int().min(0).max(10_000).default(0),
});

export const LandingPageOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  html: z.string(),
  status: z.enum(LANDING_PAGE_STATUSES),
  publishedAt: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  /** Total de acessos (do `_count`); presente nas listagens. */
  viewsCount: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/** Origem do tráfego agrupada (referrer → contagem de visitas). */
export const LandingReferrerSchema = z.object({
  referrer: z.string().nullable(),
  count: z.number().int(),
});

export const LandingPageMetricsSchema = z.object({
  totalViews: z.number().int(),
  avgDurationMs: z.number(),
  totalCtaClicks: z.number().int(),
  referrers: z.array(LandingReferrerSchema),
});

/** Mensagem do chat de geração. */
export const LandingPageMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
});

/** O que a página pública precisa — sem campos internos. */
export const PublicLandingPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  html: z.string(),
});

export type CreateLandingPageInput = z.infer<typeof CreateLandingPageSchema>;
export type UpdateLandingPageInput = z.infer<typeof UpdateLandingPageSchema>;
export type GenerateLandingPageInput = z.infer<
  typeof GenerateLandingPageSchema
>;
export type RecordLandingEventInput = z.infer<typeof RecordLandingEventSchema>;
export type LandingPageDTO = z.infer<typeof LandingPageOutputSchema>;
export type LandingPageMetricsDTO = z.infer<typeof LandingPageMetricsSchema>;
export type LandingReferrerDTO = z.infer<typeof LandingReferrerSchema>;
export type LandingPageMessageDTO = z.infer<typeof LandingPageMessageSchema>;
export type PublicLandingPageDTO = z.infer<typeof PublicLandingPageSchema>;
