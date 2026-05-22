import { z } from "zod";

/** Contrato da feature Opportunity (create / update / list / get / soft-delete). */

export const OPPORTUNITY_STAGES = [
  "NEW",
  "QUALIFIED",
  "MEETING",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

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
const StageSchema = z.enum(OPPORTUNITY_STAGES);
const IdSchema = z.string().trim().min(1);

export const CreateOpportunitySchema = z.object({
  name: NameSchema,
  amount: AmountSchema.optional(),
  closeDate: CloseDateSchema.optional(),
  stage: StageSchema.optional().default("NEW"),
  companyId: IdSchema.optional(),
  pointOfContactId: IdSchema.optional(),
  ownerId: IdSchema.optional(),
});

export const UpdateOpportunitySchema = z
  .object({
    name: NameSchema,
    amount: AmountSchema.nullable(),
    closeDate: CloseDateSchema.nullable(),
    stage: StageSchema,
    companyId: IdSchema.nullable(),
    pointOfContactId: IdSchema.nullable(),
    ownerId: IdSchema.nullable(),
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
  stage: z.enum(OPPORTUNITY_STAGES),
  companyId: z.string().nullable(),
  pointOfContactId: z.string().nullable(),
  ownerId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunitySchema>;
export type OpportunityDTO = z.infer<typeof OpportunityOutputSchema>;
