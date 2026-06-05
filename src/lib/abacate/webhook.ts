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
 * Valida a autenticidade de um webhook do AbacatePay.
 *
 * Mecanismo principal: o `?webhookSecret=` na URL (configurado no dashboard)
 * deve bater com `ABACATEPAY_WEBHOOK_SECRET`. Quando vier a assinatura HMAC
 * (`x-webhook-signature`), validamos também — incluindo o timestamp para
 * proteger contra replay (janela de 5 min).
 */
export function verifyAbacateWebhook(opts: {
  rawBody: string;
  querySecret: string | null;
  signature: string | null;
  timestamp: string | null;
}): boolean {
  const secret = getAbacateWebhookSecret();
  if (!secret) return false;

  if (!opts.querySecret || !timingEqual(opts.querySecret, secret)) {
    return false;
  }

  if (opts.signature) {
    if (opts.timestamp) {
      const now = Date.now() / 1000;
      const ts = Number(opts.timestamp);
      if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;
    }
    const expected = crypto
      .createHmac("sha256", secret)
      .update(opts.rawBody)
      .digest("base64");
    if (!timingEqual(opts.signature, expected)) return false;
  }

  return true;
}
