import { z } from "zod";

/** Contrato da feature Workspace (create / list / get-by-slug). */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const WorkspaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "O slug deve ter ao menos 2 caracteres")
  .max(50, "O slug deve ter no máximo 50 caracteres")
  .regex(SLUG_REGEX, "Use apenas letras minúsculas, números e hifens");

export const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da workspace").max(80),
  /** Opcional: quando ausente, o service deriva um slug único a partir do nome. */
  slug: WorkspaceSlugSchema.optional(),
});

export const WorkspaceOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type WorkspaceDTO = z.infer<typeof WorkspaceOutputSchema>;
