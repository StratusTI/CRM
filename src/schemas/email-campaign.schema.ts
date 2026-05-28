import { z } from "zod";

/**
 * Contrato de EmailCampaign — envio de email marketing para um conjunto de
 * pessoas do workspace. Cada campanha tem N `EmailCampaignRecipient` (snapshot
 * do destinatário no momento do envio).
 *
 * Fluxo:
 * - `recipientScope: "all"`  → todas as pessoas do workspace com pelo menos um email
 * - `recipientScope: "selected"` → ids explícitos via `personIds`
 * - `scheduledAt` opcional (ISO) — se ausente, envia imediatamente
 */

export const CampaignStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "FAILED",
]);

export const RecipientStatusSchema = z.enum(["PENDING", "SENT", "FAILED"]);

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type RecipientStatus = z.infer<typeof RecipientStatusSchema>;

const SubjectSchema = z
  .string()
  .trim()
  .min(1, "Informe o assunto")
  .max(300, "Assunto muito longo");

const ContentHtmlSchema = z
  .string()
  .min(1, "Conteúdo vazio")
  .max(200_000, "Conteúdo muito longo");

const ContentJsonSchema = z.string().max(500_000).nullable();

const RecipientScopeSchema = z.enum(["all", "selected"]);

export const CreateEmailCampaignSchema = z
  .object({
    subject: SubjectSchema,
    contentHtml: ContentHtmlSchema,
    contentJson: ContentJsonSchema.optional(),
    recipientScope: RecipientScopeSchema,
    personIds: z.array(z.string().trim().min(1)).max(5000).optional(),
    scheduledAt: z.iso.datetime().optional(),
  })
  .refine(
    (data) =>
      data.recipientScope === "all" ||
      (Array.isArray(data.personIds) && data.personIds.length > 0),
    {
      message: "Selecione ao menos uma pessoa",
      path: ["personIds"],
    },
  );

export const EmailCampaignRecipientOutputSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  personId: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
  status: RecipientStatusSchema,
  providerMessageId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EmailCampaignOutputSchema = z.object({
  id: z.string(),
  subject: z.string(),
  contentHtml: z.string(),
  contentJson: z.string().nullable(),
  fromAddress: z.string(),
  status: CampaignStatusSchema,
  recipientScope: RecipientScopeSchema,
  scheduledAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  recipientCount: z.number().int(),
  sentCount: z.number().int(),
  failedCount: z.number().int(),
  workspaceId: z.string(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EmailCampaignWithRecipientsSchema =
  EmailCampaignOutputSchema.extend({
    recipients: z.array(EmailCampaignRecipientOutputSchema),
  });

export type CreateEmailCampaignInput = z.infer<
  typeof CreateEmailCampaignSchema
>;
export type EmailCampaignDTO = z.infer<typeof EmailCampaignOutputSchema>;
export type EmailCampaignRecipientDTO = z.infer<
  typeof EmailCampaignRecipientOutputSchema
>;
export type EmailCampaignWithRecipientsDTO = z.infer<
  typeof EmailCampaignWithRecipientsSchema
>;
