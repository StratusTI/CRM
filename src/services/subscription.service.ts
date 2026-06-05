import { getPlan } from "@/src/config/plans";
import { badRequest } from "@/src/errors/app-error";
import { err, ok, type Result } from "@/src/lib/result";
import { toSubscriptionDTO } from "@/src/mappers/subscription.mapper";
import { SubscriptionRepository } from "@/src/repositories/subscription.repository";
import type {
  ChangePlanInput,
  SubscriptionDTO,
} from "@/src/schemas/subscription.schema";
import { resolveOwnerWorkspaceId } from "@/src/services/workspace-scope";

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
   * Enterprise é sob consulta (sem checkout). Para planos cobráveis, a cobrança
   * efetiva no AbacatePay é responsabilidade do serviço de pagamento — aqui
   * persistimos a escolha do plano/ciclo/assentos como fonte da verdade local.
   */
  async changePlan(
    userId: string,
    slug: string,
    input: ChangePlanInput,
  ): Promise<Result<SubscriptionDTO>> {
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
    // TODO(pagamento): para planos cobráveis, iniciar o checkout do AbacatePay
    // (cartão) e só confirmar a troca via webhook. Hoje a escolha é persistida
    // diretamente como fonte da verdade local do plano.
    const upserted = await SubscriptionRepository.upsert(ws.value, {
      plan: input.plan,
      cycle: input.cycle,
      seats,
      status: "ACTIVE",
    });
    if (!upserted.ok) return upserted;
    return ok(toSubscriptionDTO(upserted.value));
  },
};
