import type { MailProvider } from "@prisma/client";
import { googleMailClient } from "@/src/lib/email-sync/google-client";
import { microsoftMailClient } from "@/src/lib/email-sync/microsoft-client";
import type { MailClient } from "@/src/lib/email-sync/types";

const CLIENTS: Record<MailProvider, MailClient> = {
  GOOGLE: googleMailClient,
  MICROSOFT: microsoftMailClient,
};

/** Cliente de e-mail/calendário do provedor (sempre existe — enum fechado). */
export function getMailClient(provider: MailProvider): MailClient {
  return CLIENTS[provider];
}

/** Credenciais OAuth presentes no env para o provedor? */
export function isMailProviderConfigured(provider: MailProvider): boolean {
  if (provider === "GOOGLE") {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    );
  }
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
  );
}

export type { MailClient } from "@/src/lib/email-sync/types";
