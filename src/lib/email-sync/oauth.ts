import type { MailProvider } from "@prisma/client";
import { socialOauthFailed } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";

/** Tokens + e-mail da conta, resultado do fluxo OAuth. */
export type MailTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  email: string;
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const MS_SCOPES = [
  "openid",
  "email",
  "offline_access",
  "Mail.ReadWrite",
  "Mail.Send",
  "Calendars.ReadWrite",
].join(" ");

function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}
function microsoftConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
  );
}

export function mailProviderConfigured(provider: MailProvider): boolean {
  return provider === "GOOGLE" ? googleConfigured() : microsoftConfigured();
}

/** URL de autorização do provedor (consent screen). */
export function buildMailAuthorizeUrl(
  provider: MailProvider,
  redirectUri: string,
  state: string,
): string {
  if (provider === "GOOGLE") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_SCOPES,
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: MS_SCOPES,
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

type RawToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
};

/** Decodifica o `email` do id_token JWT (sem validar assinatura — uso interno). */
function emailFromIdToken(idToken: string | undefined): string {
  if (!idToken) return "";
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(
      Buffer.from(payload, "base64").toString("utf8"),
    ) as { email?: string; preferred_username?: string };
    return (json.email ?? json.preferred_username ?? "").toLowerCase();
  } catch {
    return "";
  }
}

function toTokens(raw: RawToken, email: string): MailTokens {
  return {
    accessToken: raw.access_token ?? "",
    refreshToken: raw.refresh_token ?? null,
    expiresAt: raw.expires_in
      ? new Date(Date.now() + raw.expires_in * 1000)
      : null,
    scope: raw.scope ?? null,
    email: email || emailFromIdToken(raw.id_token),
  };
}

/** Troca o authorization code por tokens. */
export async function exchangeMailCode(
  provider: MailProvider,
  code: string,
  redirectUri: string,
): Promise<Result<MailTokens>> {
  try {
    if (provider === "GOOGLE") {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      if (!res.ok) return err(socialOauthFailed("Falha na troca do código"));
      return ok(toTokens((await res.json()) as RawToken, ""));
    }
    const res = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );
    if (!res.ok) return err(socialOauthFailed("Falha na troca do código"));
    return ok(toTokens((await res.json()) as RawToken, ""));
  } catch {
    return err(socialOauthFailed("Erro de rede no OAuth"));
  }
}

/** Renova o access token a partir do refresh token. */
export async function refreshMailToken(
  provider: MailProvider,
  refreshToken: string,
): Promise<Result<MailTokens>> {
  try {
    const endpoint =
      provider === "GOOGLE"
        ? "https://oauth2.googleapis.com/token"
        : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const clientId =
      provider === "GOOGLE"
        ? process.env.GOOGLE_CLIENT_ID
        : process.env.MICROSOFT_CLIENT_ID;
    const clientSecret =
      provider === "GOOGLE"
        ? process.env.GOOGLE_CLIENT_SECRET
        : process.env.MICROSOFT_CLIENT_SECRET;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId ?? "",
        client_secret: clientSecret ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return err(socialOauthFailed("Falha ao renovar o token"));
    return ok(toTokens((await res.json()) as RawToken, ""));
  } catch {
    return err(socialOauthFailed("Erro de rede no refresh"));
  }
}
