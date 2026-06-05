import { z } from "zod";
import { CustomFieldsInputSchema } from "@/src/schemas/custom-field.schema";
import { normalizeBrazilPhone, normalizedUrl } from "@/src/schemas/shared";

/** Contrato da feature Person (create / update / list / get / soft-delete). */

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da pessoa")
  .max(200, "Nome muito longo");

const EmailsSchema = z
  .array(z.email("E-mail inválido").max(320))
  .max(20, "No máximo 20 e-mails");

const PhonesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Telefone inválido")
      .max(40)
      .transform(normalizeBrazilPhone),
  )
  .max(20, "No máximo 20 telefones");

const CitySchema = z.string().trim().max(120, "Cidade muito longa");
const JobTitleSchema = z.string().trim().max(160, "Cargo muito longo");
const LinkedinSchema = normalizedUrl("Informe uma URL de LinkedIn válida", 500);
const AvatarSchema = normalizedUrl("Informe uma URL de avatar válida", 1000);

/** id (cuid) de um registro referenciado. */
const IdSchema = z.string().trim().min(1);

export const CreatePersonSchema = z.object({
  name: NameSchema,
  emails: EmailsSchema.optional().default([]),
  phones: PhonesSchema.optional().default([]),
  city: CitySchema.optional(),
  jobTitle: JobTitleSchema.optional(),
  linkedin: LinkedinSchema.optional(),
  avatar: AvatarSchema.optional(),
  companyId: IdSchema.optional(),
  customFields: CustomFieldsInputSchema.optional(),
});

export const UpdatePersonSchema = z
  .object({
    name: NameSchema,
    emails: EmailsSchema,
    phones: PhonesSchema,
    city: CitySchema.nullable(),
    jobTitle: JobTitleSchema.nullable(),
    linkedin: LinkedinSchema.nullable(),
    avatar: AvatarSchema.nullable(),
    companyId: IdSchema.nullable(),
    customFields: CustomFieldsInputSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const PersonOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  emails: z.array(z.string()),
  phones: z.array(z.string()),
  city: z.string().nullable(),
  jobTitle: z.string().nullable(),
  linkedin: z.string().nullable(),
  avatar: z.string().nullable(),
  companyId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  customFields: CustomFieldsInputSchema.optional(),
});

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type PersonDTO = z.infer<typeof PersonOutputSchema>;
