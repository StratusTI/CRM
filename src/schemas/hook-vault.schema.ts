import { z } from "zod";
import { SocialPlatformSchema } from "@/src/schemas/social-connection.schema";

/** Contrato da feature Hook Vault (create / update / list / get / soft-delete). */

const TextSchema = z
  .string()
  .trim()
  .min(1, "Informe o texto do hook")
  .max(2000, "Texto muito longo");
const NotesSchema = z.string().trim().max(2000, "Observações muito longas");

export const CreateHookVaultItemSchema = z.object({
  text: TextSchema,
  platform: SocialPlatformSchema.nullable().optional(),
  usageCount: z.number().int().min(0).optional(),
  notes: NotesSchema.nullable().optional(),
});

export const UpdateHookVaultItemSchema = z
  .object({
    text: TextSchema,
    platform: SocialPlatformSchema.nullable(),
    usageCount: z.number().int().min(0),
    notes: NotesSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const HookVaultItemOutputSchema = z.object({
  id: z.string(),
  text: z.string(),
  platform: SocialPlatformSchema.nullable(),
  usageCount: z.number().int(),
  notes: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateHookVaultItemInput = z.infer<
  typeof CreateHookVaultItemSchema
>;
export type UpdateHookVaultItemInput = z.infer<
  typeof UpdateHookVaultItemSchema
>;
export type HookVaultItemDTO = z.infer<typeof HookVaultItemOutputSchema>;
