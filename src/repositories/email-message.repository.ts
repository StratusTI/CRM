import {
  type CalendarEvent,
  type EmailMessage,
  type MailDirection,
  Prisma,
} from "@prisma/client";
import { databaseError } from "@/src/errors/app-error";
import { prisma } from "@/src/lib/prisma";
import { err, ok, type Result } from "@/src/lib/result";

export type CreateMessageData = {
  workspaceId: string;
  accountId: string | null;
  externalId: string;
  threadId: string | null;
  direction: MailDirection;
  subject: string | null;
  snippet: string | null;
  fromEmail: string;
  toEmails: string[];
  personId: string | null;
  opportunityId: string | null;
  sentAt: Date;
};

export type CreateEventData = {
  workspaceId: string;
  accountId: string | null;
  externalId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
  personId: string | null;
  opportunityId: string | null;
};

/** Acesso a dados de e-mails e eventos importados/criados. */
export const EmailMessageRepository = {
  /** Insere a mensagem; ignora duplicatas (mesma conta+externalId). */
  async createIfNew(data: CreateMessageData): Promise<Result<boolean>> {
    try {
      await prisma.emailMessage.create({ data });
      return ok(true);
    } catch (e) {
      // Violação de unique (já importada) não é erro — só não conta.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return ok(false);
      }
      return err(databaseError());
    }
  },

  async create(data: CreateMessageData): Promise<Result<EmailMessage>> {
    try {
      const message = await prisma.emailMessage.create({ data });
      return ok(message);
    } catch {
      return err(databaseError());
    }
  },

  async listByPerson(
    workspaceId: string,
    personId: string,
    limit = 50,
  ): Promise<Result<EmailMessage[]>> {
    try {
      const messages = await prisma.emailMessage.findMany({
        where: { workspaceId, personId },
        orderBy: { sentAt: "desc" },
        take: limit,
      });
      return ok(messages);
    } catch {
      return err(databaseError());
    }
  },

  async listByOpportunity(
    workspaceId: string,
    opportunityId: string,
    limit = 50,
  ): Promise<Result<EmailMessage[]>> {
    try {
      const messages = await prisma.emailMessage.findMany({
        where: { workspaceId, opportunityId },
        orderBy: { sentAt: "desc" },
        take: limit,
      });
      return ok(messages);
    } catch {
      return err(databaseError());
    }
  },
};

export const CalendarEventRepository = {
  async createIfNew(data: CreateEventData): Promise<Result<boolean>> {
    try {
      await prisma.calendarEvent.create({ data });
      return ok(true);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return ok(false);
      }
      return err(databaseError());
    }
  },

  async create(data: CreateEventData): Promise<Result<CalendarEvent>> {
    try {
      const event = await prisma.calendarEvent.create({ data });
      return ok(event);
    } catch {
      return err(databaseError());
    }
  },
};
