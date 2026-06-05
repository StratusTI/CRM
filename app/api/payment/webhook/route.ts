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

/**
 * Webhook do AbacatePay. Rota pública (liberada no middleware). Confirma o
 * pagamento (`billing.paid`) e ativa a assinatura da workspace.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const url = new URL(request.url);

  const authentic = verifyAbacateWebhook({
    rawBody,
    querySecret: url.searchParams.get("webhookSecret"),
    signature: request.headers.get("x-webhook-signature"),
    timestamp: request.headers.get("x-webhook-timestamp"),
  });
  if (!authentic) {
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
    data?: {
      billing?: {
        id?: string;
        metadata?: unknown;
        customer?: { id?: string };
      };
    };
  };

  if (event.event === "billing.paid") {
    const billing = event.data?.billing ?? {};
    const meta = MetaSchema.safeParse(billing.metadata ?? {});
    // Só tratamos cobranças que carregam nossos metadados de assinatura.
    if (meta.success && billing.id) {
      const result = await SubscriptionService.activateFromWebhook({
        workspaceId: meta.data.workspaceId,
        plan: meta.data.plan,
        cycle: meta.data.cycle,
        seats: meta.data.seats,
        abacateBillingId: billing.id,
        abacateCustomerId: billing.customer?.id ?? null,
      });
      // Falha de persistência → 500 para o AbacatePay reenviar (retry).
      if (!result.ok) {
        return NextResponse.json(
          { error: "Processing failed" },
          {
            status: 500,
          },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
