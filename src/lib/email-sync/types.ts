import type { MailProvider } from "@prisma/client";
import type { Result } from "@/src/lib/result";

/** Mensagem normalizada vinda do provedor (Gmail/Graph). */
export type FetchedMessage = {
  externalId: string;
  threadId: string | null;
  subject: string | null;
  snippet: string | null;
  fromEmail: string;
  toEmails: string[];
  sentAt: Date;
};

/** Evento de calendário normalizado vindo do provedor. */
export type FetchedEvent = {
  externalId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
};

export type SendEmailInput = {
  to: string[];
  subject: string;
  body: string;
};

export type CreateEventInput = {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
};

/**
 * Cliente de e-mail/calendário de um provedor. As implementações concretas
 * (Gmail, Microsoft Graph) fazem as chamadas HTTP reais; a orquestração de
 * sync/envio depende só desta interface (e por isso é testável com mocks).
 */
export type MailClient = {
  provider: MailProvider;
  /** Mensagens recentes da conta (até `limit`). `accessToken` já decifrado. */
  listMessages(
    accessToken: string,
    limit: number,
  ): Promise<Result<FetchedMessage[]>>;
  /** Envia um e-mail pela conta do usuário. Retorna o id externo criado. */
  sendMessage(
    accessToken: string,
    input: SendEmailInput,
  ): Promise<Result<string>>;
  /** Eventos próximos da conta. */
  listEvents(
    accessToken: string,
    limit: number,
  ): Promise<Result<FetchedEvent[]>>;
  /** Cria um evento no calendário do provedor. Retorna o id externo. */
  createEvent(
    accessToken: string,
    input: CreateEventInput,
  ): Promise<Result<string>>;
};
