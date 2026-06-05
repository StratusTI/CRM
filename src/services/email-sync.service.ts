import type { EmailAccount } from "@prisma/client";
import { socialOauthFailed } from "@/src/errors/app-error";
import { getMailClient } from "@/src/lib/email-sync";
import { refreshMailToken } from "@/src/lib/email-sync/oauth";
import { err, ok, type Result } from "@/src/lib/result";
import {
  decryptToken,
  encryptToken,
  isTokenCryptoConfigured,
} from "@/src/lib/social/crypto";
import { EmailAccountRepository } from "@/src/repositories/email-account.repository";
import {
  CalendarEventRepository,
  EmailMessageRepository,
} from "@/src/repositories/email-message.repository";
import { PersonRepository } from "@/src/repositories/person.repository";
import { recordActivity } from "@/src/services/activity-recorder";

const TOKEN_MARGIN_MS = 60_000;
const IMPORT_LIMIT = 25;

/** Access token válido da conta, renovando e persistindo quando expira. */
async function freshToken(account: EmailAccount): Promise<Result<string>> {
  if (!isTokenCryptoConfigured()) {
    return err(socialOauthFailed("Cifragem de tokens não configurada"));
  }
  const notExpired =
    !account.tokenExpiresAt ||
    account.tokenExpiresAt.getTime() - TOKEN_MARGIN_MS > Date.now();
  if (notExpired) return ok(decryptToken(account.accessToken));

  if (!account.refreshToken) return err(socialOauthFailed("Token expirado"));
  const refreshed = await refreshMailToken(
    account.provider,
    decryptToken(account.refreshToken),
  );
  if (!refreshed.ok) return refreshed;

  await EmailAccountRepository.updateTokens(account.id, {
    accessToken: encryptToken(refreshed.value.accessToken),
    tokenExpiresAt: refreshed.value.expiresAt,
  });
  return ok(refreshed.value.accessToken);
}

/** Vincula um e-mail a uma Person da workspace por endereço (remetente/destino). */
async function matchPerson(
  workspaceId: string,
  emails: string[],
): Promise<string | null> {
  const found = await PersonRepository.findByEmailOrPhone(
    workspaceId,
    emails.map((e) => e.toLowerCase()),
    [],
  );
  return found.ok && found.value ? found.value.id : null;
}

export const EmailSyncService = {
  /**
   * Importa as mensagens/eventos recentes da conta, vincula a contatos por
   * e-mail e registra na timeline (Activity) os e-mails casados. Idempotente
   * pela unique (accountId, externalId).
   */
  async importAccount(
    account: EmailAccount,
  ): Promise<Result<{ imported: number; matched: number }>> {
    const token = await freshToken(account);
    if (!token.ok) return token;

    const client = getMailClient(account.provider);

    const messages = await client.listMessages(token.value, IMPORT_LIMIT);
    if (!messages.ok) return messages;

    let imported = 0;
    let matched = 0;
    for (const msg of messages.value) {
      const personId = await matchPerson(account.workspaceId, [
        msg.fromEmail,
        ...msg.toEmails,
      ]);
      const created = await EmailMessageRepository.createIfNew({
        workspaceId: account.workspaceId,
        accountId: account.id,
        externalId: msg.externalId,
        threadId: msg.threadId,
        direction:
          msg.fromEmail.toLowerCase() === account.email.toLowerCase()
            ? "OUTBOUND"
            : "INBOUND",
        subject: msg.subject,
        snippet: msg.snippet,
        fromEmail: msg.fromEmail,
        toEmails: msg.toEmails,
        personId,
        opportunityId: null,
        sentAt: msg.sentAt,
      });
      if (!created.ok || !created.value) continue;
      imported += 1;

      if (personId) {
        matched += 1;
        await recordActivity({
          workspaceId: account.workspaceId,
          actingUserId: account.userId,
          entity: "person",
          event: "updated",
          record: {
            id: personId,
            name: msg.subject ?? "E-mail",
            companyId: null,
          },
          changedFields: ["email"],
        });
      }
    }

    // Eventos de calendário (importação simples; vínculo por participante).
    const events = await client.listEvents(token.value, IMPORT_LIMIT);
    if (events.ok) {
      for (const ev of events.value) {
        const personId = await matchPerson(account.workspaceId, ev.attendees);
        await CalendarEventRepository.createIfNew({
          workspaceId: account.workspaceId,
          accountId: account.id,
          externalId: ev.externalId,
          title: ev.title,
          description: ev.description,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          attendees: ev.attendees,
          personId,
          opportunityId: null,
        });
      }
    }

    await EmailAccountRepository.markSynced(account.id);
    return ok({ imported, matched });
  },

  /** Envia um e-mail pela conta do usuário e registra como OUTBOUND. */
  async sendEmail(
    account: EmailAccount,
    input: { to: string[]; subject: string; body: string },
  ): Promise<Result<true>> {
    const token = await freshToken(account);
    if (!token.ok) return token;

    const client = getMailClient(account.provider);
    const sent = await client.sendMessage(token.value, input);
    if (!sent.ok) return sent;

    const personId = await matchPerson(account.workspaceId, input.to);
    await EmailMessageRepository.create({
      workspaceId: account.workspaceId,
      accountId: account.id,
      externalId: sent.value,
      threadId: null,
      direction: "OUTBOUND",
      subject: input.subject,
      snippet: input.body.slice(0, 280),
      fromEmail: account.email,
      toEmails: input.to,
      personId,
      opportunityId: null,
      sentAt: new Date(),
    });
    return ok(true);
  },

  /** Cria um evento no calendário do provedor e persiste o vínculo. */
  async createEvent(
    account: EmailAccount,
    input: {
      title: string;
      description?: string;
      startsAt: Date;
      endsAt: Date;
      attendees: string[];
    },
  ): Promise<Result<true>> {
    const token = await freshToken(account);
    if (!token.ok) return token;

    const client = getMailClient(account.provider);
    const created = await client.createEvent(token.value, input);
    if (!created.ok) return created;

    const personId = await matchPerson(account.workspaceId, input.attendees);
    await CalendarEventRepository.create({
      workspaceId: account.workspaceId,
      accountId: account.id,
      externalId: created.value,
      title: input.title,
      description: input.description ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      attendees: input.attendees,
      personId,
      opportunityId: null,
    });
    return ok(true);
  },
};

/** Tick do cron: importa todas as contas conectadas. */
export async function emailSyncTick(): Promise<{
  accounts: number;
  imported: number;
  errors: number;
}> {
  const accounts = await EmailAccountRepository.listAll();
  if (!accounts.ok) return { accounts: 0, imported: 0, errors: 1 };

  let imported = 0;
  let errors = 0;
  for (const account of accounts.value) {
    const result = await EmailSyncService.importAccount(account);
    if (!result.ok) errors += 1;
    else imported += result.value.imported;
  }
  return { accounts: accounts.value.length, imported, errors };
}
