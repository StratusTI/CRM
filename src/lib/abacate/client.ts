import { ABACATE_API_BASE, getAbacateApiKey } from "./env";

/** Toda resposta da API vem como `{ data, error }`. */
type AbacateEnvelope<T> = { data: T | null; error: string | null };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const key = getAbacateApiKey();
  if (!key) throw new Error("ABACATEPAY_API_KEY ausente");

  const res = await fetch(`${ABACATE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const json = (await res
    .json()
    .catch(() => null)) as AbacateEnvelope<T> | null;

  if (!res.ok || !json || json.error) {
    throw new Error(json?.error ?? `AbacatePay respondeu HTTP ${res.status}`);
  }
  return json.data as T;
}

export type AbacateCheckout = {
  id: string;
  url: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  externalId: string | null;
  amount: number;
};

export type AbacatePaymentMethod = "PIX" | "CARD";

export type CreateCheckoutInput = {
  items: { id: string; quantity: number }[];
  /** Métodos oferecidos no checkout. Recorrente via Pix exige PIX Automático. */
  methods?: AbacatePaymentMethod[];
  externalId?: string;
  metadata?: Record<string, unknown>;
  /** Para onde voltar caso o cliente cancele. */
  returnUrl?: string;
  /** Para onde ir após concluir o pagamento. */
  completionUrl?: string;
  customer?: {
    name?: string;
    email?: string;
    cellphone?: string;
    taxId?: string;
  };
};

/** Cliente fino da API AbacatePay v2 (só o que o fluxo de assinatura usa). */
export const AbacateClient = {
  /** Cria um checkout hospedado (cliente escolhe Pix ou cartão). */
  createCheckout(input: CreateCheckoutInput): Promise<AbacateCheckout> {
    return request<AbacateCheckout>("/checkouts/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
