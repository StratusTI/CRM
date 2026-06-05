import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BillingCycleSchema, PlanIdSchema } from "@/src/config/plans";
import { verifyAbacateWebhook } from "@/src/lib/abacate/webhook";
import { SubscriptionService } from "@/src/services/subscription.service";

/** Metadados que enviamos ao criar o checkout (ver SubscriptionService). */
const MetaSchema = z.object({
  kind: z.literal("subscription"),
  workspaceId: z.string().min(1),
  plan: PlanIdSchema,
  cycle: BillingCycleSchema,
  seats: z.coerce.number().int().min(1).catch(1),
});

/** Eventos do AbacatePay que indicam pagamento concluído de um checkout. */
const PAID_EVENTS = new Set(["checkout.completed", "billing.paid"]);

type PaidObject = {
  id?: string;
  status?: string;
  metadata?: unknown;
  customerId?: string | null;
  customer?: { id?: string } | null;
};

/**
 * Webhook do AbacatePay. Rota pública (liberada no middleware). Quando um
 * checkout é pago (`checkout.completed`/`billing.paid`), ativa a assinatura da
 * workspace a partir dos metadados enviados na criação do checkout.
 *
 * Autenticação pelo `?webhookSecret=` (configurado na URL do webhook no
 * dashboard).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const url = new URL(request.url);

  if (!verifyAbacateWebhook(url.searchParams.get("webhookSecret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body as {
    event?: string;
    data?: { checkout?: PaidObject; billing?: PaidObject };
  };

  if (event.event && PAID_EVENTS.has(event.event)) {
    // O objeto pago vem em `data.checkout` (checkout) ou `data.billing` (Pix).
    const obj = event.data?.checkout ?? event.data?.billing ?? {};
    const paid = !obj.status || obj.status === "PAID";
    const meta = MetaSchema.safeParse(obj.metadata ?? {});

    // Só ativamos cobranças pagas que carregam nossos metadados de assinatura.
    if (paid && meta.success && obj.id) {
      const result = await SubscriptionService.activateFromWebhook({
        workspaceId: meta.data.workspaceId,
        plan: meta.data.plan,
        cycle: meta.data.cycle,
        seats: meta.data.seats,
        abacateBillingId: obj.id,
        abacateCustomerId: obj.customerId ?? obj.customer?.id ?? null,
      });
      // Falha de persistência → 500 para o AbacatePay reenviar (retry).
      if (!result.ok) {
        return NextResponse.json(
          { error: "Processing failed" },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
