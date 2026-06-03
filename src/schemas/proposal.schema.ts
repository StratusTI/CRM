import { z } from "zod";

/**
 * Contrato da feature Propostas.
 *
 * Uma Proposal é um documento rico (HTML do TipTap) escopado por workspace.
 * `status` = DRAFT/PUBLISHED é o botão online/offline: quando PUBLISHED, o
 * `shareToken` opaco serve a página pública (sem auth) em `/p/<token>`.
 * As métricas de leitura vêm de ProposalView (1 linha por sessão de visita),
 * upsertada por `viewId`. O IP do visitante nunca é guardado cru — só um hash
 * salgado, para contar visitantes únicos sem expor o endereço (LGPD).
 */

export const PROPOSAL_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/**
 * Tipo do documento. Apenas classificação — todos os tipos têm as mesmas
 * capacidades; o tipo organiza/filtra e escopa os templates.
 */
export const DOCUMENT_TYPES = [
  "PREMISES",
  "PORTFOLIO",
  "PROPOSAL",
  "CONTRACT",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Rótulos em PT-BR para a UI (coluna, dropdown de criação). */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PREMISES: "Premissas",
  PORTFOLIO: "Portfólio",
  PROPOSAL: "Propostas",
  CONTRACT: "Contratos",
};

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Informe o título da proposta")
  .max(300, "Título muito longo");

/** HTML do TipTap. Validado na fronteira; o render read-only sanitiza nodes. */
const ContentSchema = z.string().max(500_000, "Documento muito grande");

export const CreateProposalSchema = z.object({
  /** Opcional: o service aplica um título padrão (ou o do template). */
  title: TitleSchema.optional(),
  content: ContentSchema.optional(),
  type: z.enum(DOCUMENT_TYPES).optional(),
  /** Quando presente, o service copia o conteúdo do template (mesmo tipo). */
  templateId: z.string().optional(),
});

/**
 * Atualização parcial. `status` alterna online/offline; `content` é salvo pelo
 * autosave do editor. Nenhum campo pode ser nulificado.
 */
export const UpdateProposalSchema = z
  .object({
    title: TitleSchema,
    content: ContentSchema,
    status: z.enum(PROPOSAL_STATUSES),
    type: z.enum(DOCUMENT_TYPES),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

/**
 * Ingestão pública de métrica de leitura. O IP é derivado do request no
 * servidor — NUNCA do corpo. `viewId` é o id de sessão gerado no cliente
 * (mesma visita ⇒ mesmo upsert).
 */
export const RecordViewSchema = z.object({
  viewId: z.string().trim().min(8).max(64),
  /** Tempo de leitura acumulado (ms). Cap de 24h evita lixo. */
  durationMs: z.number().int().min(0).max(86_400_000).default(0),
  reachedEnd: z.boolean().default(false),
  scrolledPct: z.number().int().min(0).max(100).default(0),
});

export const ProposalOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(DOCUMENT_TYPES),
  status: z.enum(PROPOSAL_STATUSES),
  shareToken: z.string(),
  publishedAt: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  /** Total de visitas (do `_count`); presente nas listagens. */
  viewsCount: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const ProposalViewOutputSchema = z.object({
  id: z.string(),
  durationMs: z.number().int(),
  reachedEnd: z.boolean(),
  scrolledPct: z.number().int(),
  referrer: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProposalMetricsSchema = z.object({
  totalViews: z.number().int(),
  uniqueVisitors: z.number().int(),
  /** Fração 0..1 de visitas que chegaram ao fim. */
  completionRate: z.number(),
  avgDurationMs: z.number(),
  views: z.array(ProposalViewOutputSchema),
});

/** O que a página pública precisa — sem campos internos. */
export const PublicProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

export type CreateProposalInput = z.infer<typeof CreateProposalSchema>;
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;
export type RecordViewInput = z.infer<typeof RecordViewSchema>;
export type ProposalDTO = z.infer<typeof ProposalOutputSchema>;
export type ProposalViewDTO = z.infer<typeof ProposalViewOutputSchema>;
export type ProposalMetricsDTO = z.infer<typeof ProposalMetricsSchema>;
export type PublicProposalDTO = z.infer<typeof PublicProposalSchema>;
