import { z } from "zod";
import { CustomFieldsInputSchema } from "@/src/schemas/custom-field.schema";

/** Contrato da feature Opportunity (create / update / list / get / soft-delete). */

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da oportunidade")
  .max(200, "Nome muito longo");

const AmountSchema = z
  .number("Valor inválido")
  .nonnegative("Valor não pode ser negativo")
  .max(1_000_000_000_000, "Valor fora do limite");

const CloseDateSchema = z.iso.datetime("Data de fechamento inválida");
const IdSchema = z.string().trim().min(1);
const SourceSchema = z
  .string()
  .trim()
  .min(1, "Origem inválida")
  .max(60, "Origem muito longa");

export const CreateOpportunitySchema = z.object({
  name: NameSchema,
  amount: AmountSchema.optional(),
  closeDate: CloseDateSchema.optional(),
  // Etapa/funil opcionais: quando omitidos, o service resolve o pipeline
  // padrão e sua primeira etapa. Se `stageId` é informado, `pipelineId` também
  // deve ser, e o service valida que a etapa pertence ao funil e à workspace.
  pipelineId: IdSchema.optional(),
  stageId: IdSchema.optional(),
  companyId: IdSchema.optional(),
  pointOfContactId: IdSchema.optional(),
  ownerId: IdSchema.optional(),
  source: SourceSchema.optional(),
  customFields: CustomFieldsInputSchema.optional(),
});

export const UpdateOpportunitySchema = z
  .object({
    name: NameSchema,
    amount: AmountSchema.nullable(),
    closeDate: CloseDateSchema.nullable(),
    pipelineId: IdSchema,
    stageId: IdSchema,
    companyId: IdSchema.nullable(),
    pointOfContactId: IdSchema.nullable(),
    ownerId: IdSchema.nullable(),
    source: SourceSchema.nullable(),
    customFields: CustomFieldsInputSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const OpportunityOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().nullable(),
  closeDate: z.string().nullable(),
  pipelineId: z.string(),
  stageId: z.string(),
  companyId: z.string().nullable(),
  pointOfContactId: z.string().nullable(),
  ownerId: z.string().nullable(),
  source: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  customFields: CustomFieldsInputSchema.optional(),
});

export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunitySchema>;
export type OpportunityDTO = z.infer<typeof OpportunityOutputSchema>;
