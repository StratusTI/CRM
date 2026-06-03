import { z } from "zod";
import { DOCUMENT_TYPES } from "@/src/schemas/proposal.schema";

/**
 * Contrato da feature Templates de Documento.
 *
 * Um DocumentTemplate é um snapshot reutilizável (título + HTML do TipTap)
 * escopado por workspace e por `type`. Criado a partir de um documento no
 * editor ("Salvar como template") e consumido ao criar um novo documento do
 * mesmo tipo.
 */

const TitleSchema = z
  .string()
  .trim()
  .min(1, "Informe o título do template")
  .max(300, "Título muito longo");

/** HTML do TipTap. Validado na fronteira; o editor sanitiza no render. */
const ContentSchema = z.string().max(500_000, "Documento muito grande");

export const CreateDocumentTemplateSchema = z.object({
  title: TitleSchema,
  content: ContentSchema.optional(),
  type: z.enum(DOCUMENT_TYPES),
});

/** Filtro opcional por tipo na listagem. */
export const ListDocumentTemplatesQuerySchema = z.object({
  type: z.enum(DOCUMENT_TYPES).optional(),
});

export const DocumentTemplateOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(DOCUMENT_TYPES),
  workspaceId: z.string(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateDocumentTemplateInput = z.infer<
  typeof CreateDocumentTemplateSchema
>;
export type DocumentTemplateDTO = z.infer<typeof DocumentTemplateOutputSchema>;
