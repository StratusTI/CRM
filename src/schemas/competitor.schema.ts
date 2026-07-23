import { z } from "zod";
import { normalizedUrl } from "@/src/schemas/shared";
import { SocialPlatformSchema } from "@/src/schemas/social-connection.schema";

/** Contrato da feature Concorrentes (create / update / list / get / soft-delete). */

const HandleSchema = z
  .string()
  .trim()
  .min(1, "Informe o @ ou nome do perfil")
  .max(200, "Handle muito longo");
const NotesSchema = z.string().trim().max(2000, "Observações muito longas");

export const CreateCompetitorSchema = z.object({
  platform: SocialPlatformSchema,
  handle: HandleSchema,
  profileUrl: normalizedUrl("Informe uma URL válida", 500)
    .nullable()
    .optional(),
  followersCount: z.number().int().min(0).nullable().optional(),
  notes: NotesSchema.nullable().optional(),
});

export const UpdateCompetitorSchema = z
  .object({
    platform: SocialPlatformSchema,
    handle: HandleSchema,
    profileUrl: normalizedUrl("Informe uma URL válida", 500).nullable(),
    followersCount: z.number().int().min(0).nullable(),
    notes: NotesSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const CompetitorOutputSchema = z.object({
  id: z.string(),
  platform: SocialPlatformSchema,
  handle: z.string(),
  profileUrl: z.string().nullable(),
  followersCount: z.number().int().nullable(),
  notes: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateCompetitorInput = z.infer<typeof CreateCompetitorSchema>;
export type UpdateCompetitorInput = z.infer<typeof UpdateCompetitorSchema>;
export type CompetitorDTO = z.infer<typeof CompetitorOutputSchema>;
