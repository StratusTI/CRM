import crypto from "node:crypto";
import { getAbacateWebhookSecret } from "./env";

/** Comparação de strings em tempo constante (evita timing attack). */
function timingEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Valida a autenticidade de um webhook do AbacatePay pelo segredo na query
 * (`?webhookSecret=`), configurado na URL do webhook no dashboard e comparado
 * com `ABACATEPAY_WEBHOOK_SECRET`. Esse é o mecanismo oficial do AbacatePay; o
 * segredo aleatório trafega sob HTTPS.
 */
export function verifyAbacateWebhook(querySecret: string | null): boolean {
  const secret = getAbacateWebhookSecret();
  if (!secret || !querySecret) return false;
  return timingEqual(querySecret, secret);
}
