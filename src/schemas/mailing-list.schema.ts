import { z } from "zod";

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da lista")
  .max(120, "Nome muito longo");

export const CreateMailingListSchema = z.object({
  name: NameSchema,
  description: z.string().trim().max(500).optional(),
});

export const UpdateMailingListSchema = z.object({
  name: NameSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export const AddMailingListMembersSchema = z.object({
  members: z
    .array(
      z.object({
        email: z.string().trim().email("Email inválido"),
        name: z.string().trim().max(200).optional(),
        personId: z.string().trim().optional(),
      }),
    )
    .min(1, "Informe ao menos um membro")
    .max(1000),
});

export const MailingListMemberOutputSchema = z.object({
  id: z.string(),
  mailingListId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  personId: z.string().nullable(),
  createdAt: z.string(),
});

export const MailingListOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number().int(),
  workspaceId: z.string(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MailingListWithMembersSchema = MailingListOutputSchema.extend({
  members: z.array(MailingListMemberOutputSchema),
});

export type CreateMailingListInput = z.infer<typeof CreateMailingListSchema>;
export type UpdateMailingListInput = z.infer<typeof UpdateMailingListSchema>;
export type AddMailingListMembersInput = z.infer<
  typeof AddMailingListMembersSchema
>;
export type MailingListDTO = z.infer<typeof MailingListOutputSchema>;
export type MailingListMemberDTO = z.infer<
  typeof MailingListMemberOutputSchema
>;
export type MailingListWithMembersDTO = z.infer<
  typeof MailingListWithMembersSchema
>;
