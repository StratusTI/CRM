import { z } from "zod";

/** Contrato de EmailTemplate — modelo reutilizável para campanhas. */

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do template")
  .max(200, "Nome muito longo");

const SubjectSchema = z
  .string()
  .trim()
  .min(1, "Informe o assunto")
  .max(300, "Assunto muito longo");

const ContentHtmlSchema = z
  .string()
  .min(1, "Conteúdo vazio")
  .max(200_000, "Conteúdo muito longo");

/** JSON serializado do estado do editor (opcional — para reabrir no editor). */
const ContentJsonSchema = z.string().max(500_000).nullable();

export const CreateEmailTemplateSchema = z.object({
  name: NameSchema,
  subject: SubjectSchema,
  contentHtml: ContentHtmlSchema,
  contentJson: ContentJsonSchema.optional(),
});

export const UpdateEmailTemplateSchema = z
  .object({
    name: NameSchema,
    subject: SubjectSchema,
    contentHtml: ContentHtmlSchema,
    contentJson: ContentJsonSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const EmailTemplateOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  contentHtml: z.string(),
  contentJson: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateEmailTemplateInput = z.infer<
  typeof CreateEmailTemplateSchema
>;
export type UpdateEmailTemplateInput = z.infer<
  typeof UpdateEmailTemplateSchema
>;
export type EmailTemplateDTO = z.infer<typeof EmailTemplateOutputSchema>;
