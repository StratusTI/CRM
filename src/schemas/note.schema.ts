import { z } from "zod";

/** Contrato da feature Note (create / update / list / get / soft-delete). */

const TitleSchema = z.string().trim().max(300, "Título muito longo");
const BodySchema = z.string().trim().max(50_000, "Conteúdo muito longo");
const IdSchema = z.string().trim().min(1);

/** Uma nota precisa de ao menos título ou corpo. */
const hasContent = (data: { title?: string | null; body?: string | null }) =>
  Boolean(data.title?.trim() || data.body?.trim());

export const CreateNoteSchema = z
  .object({
    title: TitleSchema.optional(),
    body: BodySchema.optional(),
    companyId: IdSchema.optional(),
    personId: IdSchema.optional(),
    opportunityId: IdSchema.optional(),
  })
  .refine(hasContent, {
    message: "Informe ao menos um título ou corpo",
    path: ["body"],
  });

export const UpdateNoteSchema = z
  .object({
    title: TitleSchema.nullable(),
    body: BodySchema.nullable(),
    companyId: IdSchema.nullable(),
    personId: IdSchema.nullable(),
    opportunityId: IdSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const NoteOutputSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  companyId: z.string().nullable(),
  personId: z.string().nullable(),
  opportunityId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type NoteDTO = z.infer<typeof NoteOutputSchema>;
