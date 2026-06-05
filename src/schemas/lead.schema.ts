import { z } from "zod";

/** Contrato da feature Lead (objeto + scoring + roteamento). */

export const LEAD_STATUSES = [
  "NEW",
  "WORKING",
  "QUALIFIED",
  "UNQUALIFIED",
  "CONVERTED",
] as const;

export const LEAD_RULE_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "jobTitle",
  "source",
  "city",
] as const;

export const LEAD_RULE_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;

const NameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do lead")
  .max(200, "Nome muito longo");

const EmailsSchema = z.array(z.email("E-mail inválido")).max(20);
const PhonesSchema = z.array(z.string().trim().min(1).max(40)).max(20);
const TextSchema = z.string().trim().max(200);
const SourceSchema = z.string().trim().max(60);
const StatusSchema = z.enum(LEAD_STATUSES);
const IdSchema = z.string().trim().min(1);

export const CreateLeadSchema = z.object({
  name: NameSchema,
  emails: EmailsSchema.optional().default([]),
  phones: PhonesSchema.optional().default([]),
  company: TextSchema.optional(),
  jobTitle: TextSchema.optional(),
  city: TextSchema.optional(),
  linkedin: TextSchema.optional(),
  source: SourceSchema.optional(),
  status: StatusSchema.optional().default("NEW"),
  ownerId: IdSchema.optional(),
});

export const UpdateLeadSchema = z
  .object({
    name: NameSchema,
    emails: EmailsSchema,
    phones: PhonesSchema,
    company: TextSchema.nullable(),
    jobTitle: TextSchema.nullable(),
    city: TextSchema.nullable(),
    linkedin: TextSchema.nullable(),
    source: SourceSchema.nullable(),
    status: StatusSchema,
    ownerId: IdSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const LeadOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  emails: z.array(z.string()),
  phones: z.array(z.string()),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  city: z.string().nullable(),
  linkedin: z.string().nullable(),
  source: z.string().nullable(),
  status: StatusSchema,
  score: z.number(),
  ownerId: z.string().nullable(),
  convertedPersonId: z.string().nullable(),
  convertedOpportunityId: z.string().nullable(),
  workspaceId: z.string(),
  createdById: z.string(),
  updatedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/* --------------------------------- regras --------------------------------- */

const FieldSchema = z.enum(LEAD_RULE_FIELDS);
const OperatorSchema = z.enum(LEAD_RULE_OPERATORS);
const RuleValueSchema = z.string().trim().max(200);

export const CreateScoringRuleSchema = z.object({
  field: FieldSchema,
  operator: OperatorSchema,
  value: RuleValueSchema.optional(),
  points: z.number().int().min(-1000).max(1000),
  active: z.boolean().optional().default(true),
});

export const CreateRoutingRuleSchema = z.object({
  field: FieldSchema,
  operator: OperatorSchema,
  value: RuleValueSchema.optional(),
  ownerId: IdSchema,
  active: z.boolean().optional().default(true),
});

export const ScoringRuleOutputSchema = z.object({
  id: z.string(),
  field: FieldSchema,
  operator: OperatorSchema,
  value: z.string().nullable(),
  points: z.number(),
  active: z.boolean(),
  position: z.number(),
  workspaceId: z.string(),
});

export const RoutingRuleOutputSchema = z.object({
  id: z.string(),
  field: FieldSchema,
  operator: OperatorSchema,
  value: z.string().nullable(),
  ownerId: z.string(),
  active: z.boolean(),
  position: z.number(),
  workspaceId: z.string(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
export type LeadDTO = z.infer<typeof LeadOutputSchema>;
export type CreateScoringRuleInput = z.infer<typeof CreateScoringRuleSchema>;
export type CreateRoutingRuleInput = z.infer<typeof CreateRoutingRuleSchema>;
export type ScoringRuleDTO = z.infer<typeof ScoringRuleOutputSchema>;
export type RoutingRuleDTO = z.infer<typeof RoutingRuleOutputSchema>;
