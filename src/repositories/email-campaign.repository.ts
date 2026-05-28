import type {
  CampaignRecipientScope,
  CampaignRecipientStatus,
  CampaignStatus,
  EmailCampaign,
  EmailCampaignRecipient,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateEmailCampaignData = {
  workspaceId: string;
  createdById: string;
  subject: string;
  contentHtml: string;
  contentJson: string | null;
  fromAddress: string;
  status: CampaignStatus;
  recipientScope: CampaignRecipientScope;
  scheduledAt: Date | null;
};

export type RecipientSeed = {
  personId: string | null;
  email: string;
  name: string | null;
};

export type RecipientUpdate = {
  status: CampaignRecipientStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
};

export type EmailCampaignWithRecipients = EmailCampaign & {
  recipients: EmailCampaignRecipient[];
};

export const EmailCampaignRepository = {
  /**
   * Cria a campanha + N destinatários em uma transação. Garante que nunca
   * sobre uma campanha sem recipients (ou ambos persistem, ou nada).
   */
  async createWithRecipients(
    data: CreateEmailCampaignData,
    recipients: RecipientSeed[],
  ): Promise<Result<EmailCampaignWithRecipients>> {
    try {
      const campaign = await prisma.$transaction(async (tx) => {
        const created = await tx.emailCampaign.create({ data });
        if (recipients.length > 0) {
          await tx.emailCampaignRecipient.createMany({
            data: recipients.map((r) => ({
              campaignId: created.id,
              personId: r.personId,
              email: r.email,
              name: r.name,
            })),
          });
        }
        const reloaded = await tx.emailCampaign.findUniqueOrThrow({
          where: { id: created.id },
          include: { recipients: { orderBy: { createdAt: "asc" } } },
        });
        return reloaded;
      });
      return ok(campaign);
    } catch {
      return err(databaseError());
    }
  },

  async findByIdWithRecipients(
    id: string,
  ): Promise<Result<EmailCampaignWithRecipients | null>> {
    try {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id },
        include: { recipients: { orderBy: { createdAt: "asc" } } },
      });
      return ok(campaign);
    } catch {
      return err(databaseError());
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<EmailCampaignWithRecipients[]>> {
    try {
      const campaigns = await prisma.emailCampaign.findMany({
        where: { workspaceId },
        include: { recipients: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ createdAt: "desc" }],
      });
      return ok(campaigns);
    } catch {
      return err(databaseError());
    }
  },

  async updateStatus(
    id: string,
    status: CampaignStatus,
    sentAt: Date | null = null,
  ): Promise<Result<EmailCampaign>> {
    try {
      const campaign = await prisma.emailCampaign.update({
        where: { id },
        data: { status, sentAt },
      });
      return ok(campaign);
    } catch {
      return err(databaseError());
    }
  },

  async updateRecipient(
    recipientId: string,
    update: RecipientUpdate,
  ): Promise<Result<EmailCampaignRecipient>> {
    try {
      const recipient = await prisma.emailCampaignRecipient.update({
        where: { id: recipientId },
        data: update,
      });
      return ok(recipient);
    } catch {
      return err(databaseError());
    }
  },
};
