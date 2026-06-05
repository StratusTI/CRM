import { socialOauthFailed } from "@/src/errors/app-error";
import type {
  CreateEventInput,
  FetchedEvent,
  FetchedMessage,
  MailClient,
  SendEmailInput,
} from "@/src/lib/email-sync/types";
import { err, ok, type Result } from "@/src/lib/result";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function header(
  headers: { name: string; value: string }[],
  name: string,
): string {
  return (
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

/** Extrai endereços de um header "Nome <a@b.com>, c@d.com". */
function parseAddrs(value: string): string[] {
  const matches = value.match(/[\w.+-]+@[\w.-]+\.\w+/g);
  return matches ? [...new Set(matches.map((m) => m.toLowerCase()))] : [];
}

/** Cliente Gmail (REST v1). */
export const googleMailClient: MailClient = {
  provider: "GOOGLE",

  async listMessages(accessToken, limit) {
    try {
      const listRes = await fetch(
        `${GMAIL}/messages?maxResults=${limit}&q=in:anywhere`,
        { headers: authHeaders(accessToken) },
      );
      if (!listRes.ok) return err(socialOauthFailed("Falha ao listar e-mails"));
      const list = (await listRes.json()) as { messages?: { id: string }[] };
      const ids = (list.messages ?? []).slice(0, limit);

      const messages: FetchedMessage[] = [];
      for (const { id } of ids) {
        const msgRes = await fetch(
          `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: authHeaders(accessToken) },
        );
        if (!msgRes.ok) continue;
        const msg = (await msgRes.json()) as {
          id: string;
          threadId?: string;
          snippet?: string;
          internalDate?: string;
          payload?: { headers?: { name: string; value: string }[] };
        };
        const headers = msg.payload?.headers ?? [];
        const from = parseAddrs(header(headers, "From"));
        messages.push({
          externalId: msg.id,
          threadId: msg.threadId ?? null,
          subject: header(headers, "Subject") || null,
          snippet: msg.snippet ?? null,
          fromEmail: from[0] ?? "",
          toEmails: parseAddrs(header(headers, "To")),
          sentAt: msg.internalDate
            ? new Date(Number(msg.internalDate))
            : new Date(),
        });
      }
      return ok(messages);
    } catch {
      return err(socialOauthFailed("Erro de rede (Gmail)"));
    }
  },

  async sendMessage(accessToken, input: SendEmailInput) {
    try {
      const raw = [
        `To: ${input.to.join(", ")}`,
        `Subject: ${input.subject}`,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        input.body,
      ].join("\r\n");
      const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const res = await fetch(`${GMAIL}/messages/send`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ raw: encoded }),
      });
      if (!res.ok) return err(socialOauthFailed("Falha ao enviar e-mail"));
      const json = (await res.json()) as { id: string };
      return ok(json.id);
    } catch {
      return err(socialOauthFailed("Erro de rede (Gmail)"));
    }
  },

  async listEvents(accessToken, limit) {
    try {
      const now = new Date().toISOString();
      const res = await fetch(
        `${CALENDAR}/events?maxResults=${limit}&timeMin=${now}&orderBy=startTime&singleEvents=true`,
        { headers: authHeaders(accessToken) },
      );
      if (!res.ok) return err(socialOauthFailed("Falha ao listar eventos"));
      const json = (await res.json()) as {
        items?: {
          id: string;
          summary?: string;
          description?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          attendees?: { email: string }[];
        }[];
      };
      const events: FetchedEvent[] = (json.items ?? []).map((e) => ({
        externalId: e.id,
        title: e.summary ?? "(sem título)",
        description: e.description ?? null,
        startsAt: new Date(e.start?.dateTime ?? e.start?.date ?? Date.now()),
        endsAt: new Date(e.end?.dateTime ?? e.end?.date ?? Date.now()),
        attendees: (e.attendees ?? []).map((a) => a.email.toLowerCase()),
      }));
      return ok(events);
    } catch {
      return err(socialOauthFailed("Erro de rede (Calendar)"));
    }
  },

  async createEvent(accessToken, input: CreateEventInput) {
    try {
      const res = await fetch(`${CALENDAR}/events`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          summary: input.title,
          description: input.description,
          start: { dateTime: input.startsAt.toISOString() },
          end: { dateTime: input.endsAt.toISOString() },
          attendees: input.attendees.map((email) => ({ email })),
        }),
      });
      if (!res.ok) return err(socialOauthFailed("Falha ao criar evento"));
      const json = (await res.json()) as { id: string };
      return ok(json.id);
    } catch {
      return err(socialOauthFailed("Erro de rede (Calendar)"));
    }
  },
};
