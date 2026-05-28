import { Resend } from "resend";

let cached: Resend | null = null;

/** Cliente Resend lazy — só instancia quando há API key configurada. */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new Resend(apiKey);
  return cached;
}

export function getFromAddress(): string | null {
  return process.env.EMAIL_FROM ?? null;
}
