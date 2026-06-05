import { z } from "zod";

/** Contrato da feature Campos customizados (definições por entidade). */

export const CUSTOM_FIELD_ENTITIES = [
  "COMPANY",
  "PERSON",
  "OPPORTUNITY",
] as const;

export const CUSTOM_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
] as const;

const EntitySchema = z.enum(CUSTOM_FIELD_ENTITIES);
const TypeSchema = z.enum(CUSTOM_FIELD_TYPES);

const KeySchema = z
  .string()
  .trim()
  .min(1, "Informe a chave")
  .max(60, "Chave muito longa")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Use minúsculas, números e _ (começando por letra)",
  );

const LabelSchema = z
  .string()
  .trim()
  .min(1, "Informe o rótulo")
  .max(120, "Rótulo muito longo");

const OptionsSchema = z.array(z.string().trim().min(1).max(120)).max(100);

const BaseShape = {
  entity: EntitySchema,
  key: KeySchema,
  label: LabelSchema,
  type: TypeSchema,
  options: OptionsSchema.optional().default([]),
  required: z.boolean().optional().default(false),
};

/** SELECT exige ao menos uma opção; demais tipos não usam opções. */
function refineOptions<T extends { type: string; options?: string[] }>(
  data: T,
): boolean {
  if (data.type === "SELECT") return (data.options?.length ?? 0) > 0;
  return true;
}

export const CreateCustomFieldSchema = z
  .object(BaseShape)
  .refine(refineOptions, {
    message: "Campos do tipo seleção precisam de ao menos uma opção",
    path: ["options"],
  });

/** Atualização: `entity`/`type`/`key` são imutáveis após criação. */
export const UpdateCustomFieldSchema = z
  .object({
    label: LabelSchema,
    options: OptionsSchema,
    required: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const CustomFieldOutputSchema = z.object({
  id: z.string(),
  entity: EntitySchema,
  key: z.string(),
  label: z.string(),
  type: TypeSchema,
  options: z.array(z.string()),
  required: z.boolean(),
  position: z.number(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof UpdateCustomFieldSchema>;
export type CustomFieldDTO = z.infer<typeof CustomFieldOutputSchema>;

/**
 * Valores de campos customizados num payload de entidade: mapa
 * `definitionId → valor`. Reutilizado por Company/Person/Opportunity.
 */
export const CustomFieldsInputSchema = z.record(z.string(), z.unknown());
export type CustomFieldsInput = z.infer<typeof CustomFieldsInputSchema>;
