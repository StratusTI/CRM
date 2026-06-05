import type { EmailMessage } from "@prisma/client";

export type EmailMessageDTO = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  subject: string | null;
  snippet: string | null;
  fromEmail: string;
  toEmails: string[];
  sentAt: string;
};

export function toEmailMessageDTO(message: EmailMessage): EmailMessageDTO {
  return {
    id: message.id,
    direction: message.direction,
    subject: message.subject,
    snippet: message.snippet,
    fromEmail: message.fromEmail,
    toEmails: message.toEmails,
    sentAt: message.sentAt.toISOString(),
  };
}
