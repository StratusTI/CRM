import {
  ABACATEPAY_API_KEY,
  ABACATEPAY_WEBHOOK_SECRET,
} from "@/lib/env/_server";

/** Base da API AbacatePay v2. O ambiente (Dev/Prod) é definido pela chave. */
export const ABACATE_API_BASE = "https://api.abacatepay.com/v2";

/** Pagamento está configurado? (precisa ao menos da API key). */
export function isAbacateConfigured(): boolean {
  return Boolean(ABACATEPAY_API_KEY);
}

export function getAbacateApiKey(): string | undefined {
  return ABACATEPAY_API_KEY;
}

export function getAbacateWebhookSecret(): string | undefined {
  return ABACATEPAY_WEBHOOK_SECRET;
}
