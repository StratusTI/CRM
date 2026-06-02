import { z } from "zod";
import {
  CreateOpportunitySchema,
  OpportunityOutputSchema,
} from "@/src/schemas/opportunity.schema";
import {
  CreatePersonSchema,
  PersonOutputSchema,
} from "@/src/schemas/person.schema";

/**
 * Contrato da ingestão de leads vinda de canais de marketing (WhatsApp,
 * ligação, direct). Cada requisição abre uma oportunidade a partir de um
 * único contato — a pessoa é deduplicada por e-mail/telefone na workspace.
 */

/**
 * Dados da oportunidade no lead. Reaproveita o contrato de Opportunity, mas:
 * - `pointOfContactId` é resolvido pela pessoa do próprio lead (não é enviado);
 * - `name` é opcional — quando ausente, herda o nome da pessoa.
 */
const LeadOpportunitySchema = CreateOpportunitySchema.omit({
  pointOfContactId: true,
}).partial({ name: true });

export const IngestLeadSchema = z.object({
  person: CreatePersonSchema,
  opportunity: LeadOpportunitySchema.optional(),
});

export const IngestLeadResultSchema = z.object({
  /** `true` quando a oportunidade foi vinculada a uma pessoa já existente. */
  personReused: z.boolean(),
  person: PersonOutputSchema,
  opportunity: OpportunityOutputSchema,
});

export type IngestLeadInput = z.infer<typeof IngestLeadSchema>;
export type LeadOpportunityInput = z.infer<typeof LeadOpportunitySchema>;
export type IngestLeadResult = z.infer<typeof IngestLeadResultSchema>;
