import { withPublicUrl } from "@/lib/api-url";
import {
  abacateExternalId,
  abacateProductId,
  type BillingCycle,
  getPlan,
  type PlanId,
} from "@/src/config/plans";
import {
  abacateCheckoutFailed,
  abacateNotConfigured,
  badRequest,
} from "@/src/errors/app-error";
import { AbacateClient } from "@/src/lib/abacate/client";
import { isAbacateConfigured } from "@/src/lib/abacate/env";
import { err, ok, type Result } from "@/src/lib/result";
import { toSubscriptionDTO } from "@/src/mappers/subscription.mapper";
import { SubscriptionRepository } from "@/src/repositories/subscription.repository";
import type {
  ChangePlanInput,
  ChangePlanResult,
  SubscriptionDTO,
} from "@/src/schemas/subscription.schema";
import { resolveOwnerWorkspaceId } from "@/src/services/workspace-scope";

/** Fim do período de cobrança a partir de agora, conforme o ciclo. */
function periodEnd(cycle: BillingCycle, from = new Date()): Date {
  const end = new Date(from);
  if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

/** Dados confirmados pelo webhook `billing.paid` para ativar a assinatura. */
export type ActivateSubscriptionInput = {
  workspaceId: string;
  plan: PlanId;
  cycle: BillingCycle;
  seats: number;
  abacateBillingId: string;
  abacateCustomerId: string | null;
};

export const SubscriptionService = {
  /** Assinatura atual da workspace (Free quando não há registro). Owner-only. */
  async getCurrent(
    userId: string,
    slug: string,
  ): Promise<Result<SubscriptionDTO>> {
    const ws = await resolveOwnerWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const found = await SubscriptionRepository.findByWorkspace(ws.value);
    if (!found.ok) return found;
    return ok(toSubscriptionDTO(found.value));
  },

  /**
   * Troca o plano da workspace. Owner-only.
   *
   * - **Free**: troca imediata, sem pagamento.
   * - **Enterprise**: sob consulta (sem checkout).
   * - **Cobráveis (Pro/Scale)**: cria um checkout no AbacatePay e retorna a
   *   `checkoutUrl` (Pix ou cartão). O plano só muda quando o webhook
   *   `billing.paid` confirmar o pagamento — até lá, o plano atual é mantido.
   */
  async changePlan(
    userId: string,
    slug: string,
    input: ChangePlanInput,
  ): Promise<Result<ChangePlanResult>> {
    const ws = await resolveOwnerWorkspaceId(userId, slug);
    if (!ws.ok) return ws;

    const plan = getPlan(input.plan);
    if (plan.cta === "contact") {
      return err(
        badRequest(
          "O plano Enterprise é sob consulta. Fale com o time de vendas.",
        ),
      );
    }

    const seats = input.seats ?? 1;

    // Free: troca imediata, sem cobrança.
    if (plan.cta === "free") {
      const upserted = await SubscriptionRepository.upsert(ws.value, {
        plan: input.plan,
        cycle: input.cycle,
        seats,
        status: "ACTIVE",
        currentPeriodEnd: null,
      });
      if (!upserted.ok) return upserted;
      return ok({
        subscription: toSubscriptionDTO(upserted.value),
        checkoutUrl: null,
      });
    }

    // Cobráveis: precisa do AbacatePay configurado e do produto cadastrado.
    if (!isAbacateConfigured()) return err(abacateNotConfigured());
    const productId = abacateProductId(input.plan, input.cycle);
    if (!productId) {
      return err(
        abacateNotConfigured(
          "Produto não cadastrado no AbacatePay para este plano/ciclo.",
        ),
      );
    }

    // Mantém o plano atual até o pagamento ser confirmado pelo webhook.
    const current = await SubscriptionRepository.findByWorkspace(ws.value);
    if (!current.ok) return current;

    const backUrl = withPublicUrl(`/${slug}/billing`).toString();
    try {
      const checkout = await AbacateClient.createCheckout({
        items: [{ id: productId, quantity: 1 }],
        // Assinatura recorrente no cartão. Pix recorrente exigiria habilitar
        // "PIX Automático" na loja do AbacatePay.
        methods: ["CARD"],
        externalId: abacateExternalId(input.plan, input.cycle),
        metadata: {
          kind: "subscription",
          workspaceId: ws.value,
          plan: input.plan,
          cycle: input.cycle,
          seats,
        },
        returnUrl: backUrl,
        completionUrl: backUrl,
      });
      return ok({
        subscription: toSubscriptionDTO(current.value),
        checkoutUrl: checkout.url,
      });
    } catch (error) {
      return err(abacateCheckoutFailed(undefined, String(error)));
    }
  },

  /**
   * Ativa/atualiza a assinatura após o webhook `billing.paid`. Não é owner-only
   * (chamada de sistema). Idempotente: ignora reentrega do mesmo pagamento.
   */
  async activateFromWebhook(
    input: ActivateSubscriptionInput,
  ): Promise<Result<void>> {
    const current = await SubscriptionRepository.findByWorkspace(
      input.workspaceId,
    );
    if (!current.ok) return current;

    if (
      current.value?.abacateSubscriptionId === input.abacateBillingId &&
      current.value?.status === "ACTIVE"
    ) {
      return ok(undefined); // já processado
    }

    const upserted = await SubscriptionRepository.upsert(input.workspaceId, {
      plan: input.plan,
      cycle: input.cycle,
      seats: input.seats,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd(input.cycle),
      cancelAtPeriodEnd: false,
      abacateProductId: abacateProductId(input.plan, input.cycle),
      abacateSubscriptionId: input.abacateBillingId,
      abacateCustomerId: input.abacateCustomerId,
    });
    if (!upserted.ok) return upserted;
    return ok(undefined);
  },
};
