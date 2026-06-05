import { socialOauthFailed } from "@/src/errors/app-error";
import type {
  CreateEventInput,
  FetchedEvent,
  FetchedMessage,
  MailClient,
  SendEmailInput,
} from "@/src/lib/email-sync/types";
import { err, ok, type Result } from "@/src/lib/result";

const GRAPH = "https://graph.microsoft.com/v1.0/me";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Cliente Microsoft Graph (Outlook Mail + Calendar). */
export const microsoftMailClient: MailClient = {
  provider: "MICROSOFT",

  async listMessages(accessToken, limit) {
    try {
      const res = await fetch(
        `${GRAPH}/messages?$top=${limit}&$select=id,conversationId,subject,bodyPreview,from,toRecipients,sentDateTime`,
        { headers: authHeaders(accessToken) },
      );
      if (!res.ok) return err(socialOauthFailed("Falha ao listar e-mails"));
      const json = (await res.json()) as {
        value?: {
          id: string;
          conversationId?: string;
          subject?: string;
          bodyPreview?: string;
          from?: { emailAddress?: { address?: string } };
          toRecipients?: { emailAddress?: { address?: string } }[];
          sentDateTime?: string;
        }[];
      };
      const messages: FetchedMessage[] = (json.value ?? []).map((m) => ({
        externalId: m.id,
        threadId: m.conversationId ?? null,
        subject: m.subject ?? null,
        snippet: m.bodyPreview ?? null,
        fromEmail: (m.from?.emailAddress?.address ?? "").toLowerCase(),
        toEmails: (m.toRecipients ?? [])
          .map((r) => (r.emailAddress?.address ?? "").toLowerCase())
          .filter(Boolean),
        sentAt: m.sentDateTime ? new Date(m.sentDateTime) : new Date(),
      }));
      return ok(messages);
    } catch {
      return err(socialOauthFailed("Erro de rede (Graph)"));
    }
  },

  async sendMessage(accessToken, input: SendEmailInput) {
    try {
      const res = await fetch(`${GRAPH}/sendMail`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: { contentType: "Text", content: input.body },
            toRecipients: input.to.map((address) => ({
              emailAddress: { address },
            })),
          },
        }),
      });
      if (!res.ok && res.status !== 202) {
        return err(socialOauthFailed("Falha ao enviar e-mail"));
      }
      // Graph sendMail não devolve id; usamos um marcador temporal.
      return ok(`sent-${Date.now()}`);
    } catch {
      return err(socialOauthFailed("Erro de rede (Graph)"));
    }
  },

  async listEvents(accessToken, limit) {
    try {
      const res = await fetch(
        `${GRAPH}/events?$top=${limit}&$select=id,subject,bodyPreview,start,end,attendees&$orderby=start/dateTime`,
        { headers: authHeaders(accessToken) },
      );
      if (!res.ok) return err(socialOauthFailed("Falha ao listar eventos"));
      const json = (await res.json()) as {
        value?: {
          id: string;
          subject?: string;
          bodyPreview?: string;
          start?: { dateTime?: string };
          end?: { dateTime?: string };
          attendees?: { emailAddress?: { address?: string } }[];
        }[];
      };
      const events: FetchedEvent[] = (json.value ?? []).map((e) => ({
        externalId: e.id,
        title: e.subject ?? "(sem título)",
        description: e.bodyPreview ?? null,
        startsAt: new Date(e.start?.dateTime ?? Date.now()),
        endsAt: new Date(e.end?.dateTime ?? Date.now()),
        attendees: (e.attendees ?? [])
          .map((a) => (a.emailAddress?.address ?? "").toLowerCase())
          .filter(Boolean),
      }));
      return ok(events);
    } catch {
      return err(socialOauthFailed("Erro de rede (Graph)"));
    }
  },

  async createEvent(accessToken, input: CreateEventInput) {
    try {
      const res = await fetch(`${GRAPH}/events`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          subject: input.title,
          body: { contentType: "Text", content: input.description ?? "" },
          start: { dateTime: input.startsAt.toISOString(), timeZone: "UTC" },
          end: { dateTime: input.endsAt.toISOString(), timeZone: "UTC" },
          attendees: input.attendees.map((address) => ({
            emailAddress: { address },
            type: "required",
          })),
        }),
      });
      if (!res.ok) return err(socialOauthFailed("Falha ao criar evento"));
      const json = (await res.json()) as { id: string };
      return ok(json.id);
    } catch {
      return err(socialOauthFailed("Erro de rede (Graph)"));
    }
  },
};
