import {
  emailCampaignNotFound,
  emailNoRecipients,
  emailProviderNotConfigured,
  emailSendFailed,
} from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { getFromAddress, getResendClient } from "@/src/lib/resend";
import { err, ok, type Result } from "@/src/lib/result";
import {
  toEmailCampaignDTO,
  toEmailCampaignWithRecipientsDTO,
} from "@/src/mappers/email-campaign.mapper";
import {
  EmailCampaignRepository,
  type RecipientSeed,
} from "@/src/repositories/email-campaign.repository";
import type {
  CreateEmailCampaignInput,
  EmailCampaignDTO,
  EmailCampaignWithRecipientsDTO,
} from "@/src/schemas/email-campaign.schema";
import { resolveWorkspaceId } from "@/src/services/workspace-scope";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Coleta destinatários para a campanha. Retorna snapshots {personId, email,
 * name} prontos para persistir. Para `all`, varre todas as Pessoas do
 * workspace e expande o array `emails` (uma linha por endereço). Para
 * `selected`, valida que os ids pertencem ao workspace e expande igual.
 */
async function collectRecipients(
  workspaceId: string,
  scope: "all" | "selected",
  personIds: string[] | undefined,
): Promise<Result<RecipientSeed[]>> {
  const where =
    scope === "all"
      ? { workspaceId, deletedAt: null }
      : { workspaceId, deletedAt: null, id: { in: personIds ?? [] } };

  const people = await prisma.person.findMany({
    where,
    select: { id: true, name: true, emails: true },
  });

  const seeds: RecipientSeed[] = [];
  const seen = new Set<string>();
  for (const p of people) {
    for (const raw of p.emails) {
      const email = raw.trim().toLowerCase();
      if (!email || !EMAIL_RX.test(email)) continue;
      const key = `${p.id}:${email}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seeds.push({ personId: p.id, email, name: p.name });
    }
  }
  if (seeds.length === 0) return err(emailNoRecipients());
  return ok(seeds);
}

export const EmailCampaignService = {
  /**
   * Cria a campanha + lista de destinatários e dispara o envio (ou agenda no
   * Resend via `scheduled_at`). Erros do provedor por destinatário são
   * persistidos em `errorMessage`; a campanha só vai a FAILED se *todos*
   * falharem.
   */
  async createAndSend(
    userId: string,
    slug: string,
    input: CreateEmailCampaignInput,
  ): Promise<Result<EmailCampaignWithRecipientsDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const resend = getResendClient();
    const from = getFromAddress();
    if (!resend || !from) return err(emailProviderNotConfigured());

    const recipients = await collectRecipients(
      ws.value,
      input.recipientScope,
      input.personIds,
    );
    if (!recipients.ok) return recipients;

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const isScheduled = scheduledAt !== null && scheduledAt > new Date();

    const created = await EmailCampaignRepository.createWithRecipients(
      {
        workspaceId: ws.value,
        createdById: userId,
        subject: input.subject,
        contentHtml: input.contentHtml,
        contentJson: input.contentJson ?? null,
        fromAddress: from,
        status: isScheduled ? "SCHEDULED" : "SENDING",
        recipientScope: input.recipientScope === "all" ? "ALL" : "SELECTED",
        scheduledAt,
      },
      recipients.value,
    );
    if (!created.ok) return created;

    const campaign = created.value;
    const now = new Date();
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of campaign.recipients) {
      const to = recipient.name
        ? `${recipient.name} <${recipient.email}>`
        : recipient.email;
      try {
        const res = await resend.emails.send({
          from,
          to,
          subject: campaign.subject,
          html: campaign.contentHtml,
          ...(isScheduled && scheduledAt
            ? { scheduledAt: scheduledAt.toISOString() }
            : {}),
        });
        if (res.error) {
          failedCount++;
          await EmailCampaignRepository.updateRecipient(recipient.id, {
            status: "FAILED",
            errorMessage: res.error.message ?? "Erro desconhecido",
          });
        } else {
          sentCount++;
          await EmailCampaignRepository.updateRecipient(recipient.id, {
            status: "SENT",
            providerMessageId: res.data?.id ?? null,
            sentAt: isScheduled ? null : now,
          });
        }
      } catch (e) {
        failedCount++;
        const message = e instanceof Error ? e.message : "Erro de envio";
        await EmailCampaignRepository.updateRecipient(recipient.id, {
          status: "FAILED",
          errorMessage: message,
        });
      }
    }

    let finalStatus: "SCHEDULED" | "SENT" | "FAILED";
    let sentAt: Date | null;
    if (isScheduled) {
      finalStatus =
        failedCount === campaign.recipients.length ? "FAILED" : "SCHEDULED";
      sentAt = null;
    } else if (sentCount === 0) {
      finalStatus = "FAILED";
      sentAt = null;
    } else {
      finalStatus = "SENT";
      sentAt = now;
    }

    const updated = await EmailCampaignRepository.updateStatus(
      campaign.id,
      finalStatus,
      sentAt,
    );
    if (!updated.ok) return updated;

    const reloaded = await EmailCampaignRepository.findByIdWithRecipients(
      campaign.id,
    );
    if (!reloaded.ok) return reloaded;
    if (!reloaded.value) return err(emailSendFailed("Campanha não persistida"));

    return ok(
      toEmailCampaignWithRecipientsDTO(
        reloaded.value,
        reloaded.value.recipients,
      ),
    );
  },

  async list(
    userId: string,
    slug: string,
  ): Promise<Result<EmailCampaignDTO[]>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await EmailCampaignRepository.listByWorkspace(ws.value);
    if (!result.ok) return result;
    return ok(result.value.map((c) => toEmailCampaignDTO(c, c.recipients)));
  },

  async getById(
    userId: string,
    slug: string,
    id: string,
  ): Promise<Result<EmailCampaignWithRecipientsDTO>> {
    const ws = await resolveWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const result = await EmailCampaignRepository.findByIdWithRecipients(id);
    if (!result.ok) return result;
    if (!result.value || result.value.workspaceId !== ws.value) {
      return err(emailCampaignNotFound());
    }
    return ok(
      toEmailCampaignWithRecipientsDTO(result.value, result.value.recipients),
    );
  },
};
