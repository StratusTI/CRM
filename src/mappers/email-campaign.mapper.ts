import type { EmailCampaign, EmailCampaignRecipient } from "@prisma/client";
import type {
  EmailCampaignDTO,
  EmailCampaignRecipientDTO,
  EmailCampaignWithRecipientsDTO,
} from "@/src/schemas/email-campaign.schema";

export function toEmailCampaignRecipientDTO(
  recipient: EmailCampaignRecipient,
): EmailCampaignRecipientDTO {
  return {
    id: recipient.id,
    campaignId: recipient.campaignId,
    personId: recipient.personId,
    email: recipient.email,
    name: recipient.name,
    status: recipient.status,
    providerMessageId: recipient.providerMessageId,
    errorMessage: recipient.errorMessage,
    sentAt: recipient.sentAt ? recipient.sentAt.toISOString() : null,
    createdAt: recipient.createdAt.toISOString(),
    updatedAt: recipient.updatedAt.toISOString(),
  };
}

function recipientScopeToDTO(
  scope: EmailCampaign["recipientScope"],
): EmailCampaignDTO["recipientScope"] {
  return scope === "ALL" ? "all" : "selected";
}

export function toEmailCampaignDTO(
  campaign: EmailCampaign,
  recipients: EmailCampaignRecipient[],
): EmailCampaignDTO {
  let sentCount = 0;
  let failedCount = 0;
  for (const r of recipients) {
    if (r.status === "SENT") sentCount++;
    else if (r.status === "FAILED") failedCount++;
  }
  return {
    id: campaign.id,
    subject: campaign.subject,
    contentHtml: campaign.contentHtml,
    contentJson: campaign.contentJson,
    fromAddress: campaign.fromAddress,
    status: campaign.status,
    recipientScope: recipientScopeToDTO(campaign.recipientScope),
    scheduledAt: campaign.scheduledAt
      ? campaign.scheduledAt.toISOString()
      : null,
    sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    workspaceId: campaign.workspaceId,
    createdById: campaign.createdById,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export function toEmailCampaignWithRecipientsDTO(
  campaign: EmailCampaign,
  recipients: EmailCampaignRecipient[],
): EmailCampaignWithRecipientsDTO {
  return {
    ...toEmailCampaignDTO(campaign, recipients),
    recipients: recipients.map(toEmailCampaignRecipientDTO),
  };
}
