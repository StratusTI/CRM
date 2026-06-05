import { describe, expect, it } from "vitest";
import {
  ABACATE_PRODUCT_IDS,
  ANNUAL_DISCOUNT_RATE,
  abacateExternalId,
  abacateProductId,
  BILLING_CYCLES,
  BillingCycleSchema,
  formatBRL,
  getPlan,
  isBillable,
  isUnlimited,
  PLAN_IDS,
  PLAN_LIST,
  PLAN_ORDER,
  PLANS,
  PlanIdSchema,
  priceFor,
  recommendPlanForSeats,
  UNLIMITED,
  withinLimit,
} from "@/src/config/plans";

describe("catálogo de planos", () => {
  it("expõe os 4 planos na ordem de exibição", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro", "scale", "enterprise"]);
    expect(PLAN_LIST.map((p) => p.id)).toEqual([...PLAN_IDS]);
  });

  it("cada definição tem o id casando com a chave do mapa", () => {
    for (const id of PLAN_IDS) {
      expect(PLANS[id].id).toBe(id);
    }
  });

  it("Free é gratuito e Enterprise é sob consulta", () => {
    expect(getPlan("free").priceMonthly).toBe(0);
    expect(getPlan("free").priceYearly).toBe(0);
    expect(getPlan("enterprise").priceMonthly).toBeNull();
    expect(getPlan("enterprise").priceYearly).toBeNull();
  });

  it("o ciclo anual aplica 20% de desconto sobre 12x o mensal", () => {
    for (const id of ["pro", "scale"] as const) {
      const plan = getPlan(id);
      const monthly = plan.priceMonthly as number;
      const expected = Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT_RATE));
      expect(plan.priceYearly).toBe(expected);
    }
  });

  it("priceFor retorna o preço do ciclo certo", () => {
    expect(priceFor("pro", "monthly")).toBe(9_700);
    expect(priceFor("pro", "yearly")).toBe(getPlan("pro").priceYearly);
    expect(priceFor("enterprise", "monthly")).toBeNull();
  });

  it("apenas Pro e Scale são cobráveis via checkout", () => {
    expect(isBillable("free")).toBe(false);
    expect(isBillable("pro")).toBe(true);
    expect(isBillable("scale")).toBe(true);
    expect(isBillable("enterprise")).toBe(false);
  });

  it("externalId do AbacatePay segue plan_<id>_<cycle>", () => {
    expect(abacateExternalId("pro", "monthly")).toBe("plan_pro_monthly");
    expect(abacateExternalId("scale", "yearly")).toBe("plan_scale_yearly");
  });

  it("todo plano cobrável tem productId do AbacatePay em ambos os ciclos", () => {
    for (const plan of PLAN_LIST) {
      for (const cycle of BILLING_CYCLES) {
        const productId = abacateProductId(plan.id, cycle);
        if (isBillable(plan.id)) {
          expect(productId).toMatch(/^prod_/);
        } else {
          expect(productId).toBeNull();
        }
      }
    }
  });

  it("productIds são únicos por plano/ciclo", () => {
    const ids = Object.values(ABACATE_PRODUCT_IDS).flatMap((byCycle) =>
      Object.values(byCycle ?? {}),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Enterprise tem todos os limites ilimitados", () => {
    const limits = getPlan("enterprise").limits;
    for (const value of Object.values(limits)) {
      expect(isUnlimited(value)).toBe(true);
    }
  });

  it("withinLimit respeita o sentinela UNLIMITED", () => {
    expect(withinLimit(UNLIMITED, 999_999)).toBe(true);
    expect(withinLimit(2, 1)).toBe(true);
    expect(withinLimit(2, 2)).toBe(false);
    expect(withinLimit(2, 3)).toBe(false);
  });

  it("recommendPlanForSeats sobe de plano conforme cresce a equipe", () => {
    expect(recommendPlanForSeats(1)).toBe("pro");
    expect(recommendPlanForSeats(10)).toBe("pro");
    expect(recommendPlanForSeats(11)).toBe("scale");
    expect(recommendPlanForSeats(50)).toBe("scale");
    // acima de todos os planos cobráveis, recomenda o maior (Scale)
    expect(recommendPlanForSeats(5_000)).toBe("scale");
  });

  it("limites crescem (ou ficam ilimitados) conforme sobe de plano", () => {
    const order = ["free", "pro", "scale", "enterprise"] as const;
    const keys = Object.keys(PLANS.free.limits) as Array<
      keyof typeof PLANS.free.limits
    >;
    for (const key of keys) {
      for (let i = 1; i < order.length; i++) {
        const prev = PLANS[order[i - 1]].limits[key];
        const curr = PLANS[order[i]].limits[key];
        if (isUnlimited(prev)) {
          expect(isUnlimited(curr)).toBe(true);
        } else if (!isUnlimited(curr)) {
          expect(curr).toBeGreaterThanOrEqual(prev);
        }
      }
    }
  });

  it("SSO é exclusivo do Enterprise", () => {
    expect(PLANS.free.features.sso).toBe(false);
    expect(PLANS.pro.features.sso).toBe(false);
    expect(PLANS.scale.features.sso).toBe(false);
    expect(PLANS.enterprise.features.sso).toBe(true);
  });

  it("formatBRL formata centavos em moeda brasileira", () => {
    // Intl usa espaços não-quebráveis (U+00A0/U+202F) entre símbolo e valor.
    const norm = (s: string) => s.replace(/\s/g, " ");
    expect(norm(formatBRL(9_700))).toBe("R$ 97,00");
    expect(norm(formatBRL(0))).toBe("R$ 0,00");
  });

  it("schemas Zod aceitam valores válidos e rejeitam inválidos", () => {
    expect(PlanIdSchema.parse("pro")).toBe("pro");
    expect(BillingCycleSchema.parse("yearly")).toBe("yearly");
    expect(PlanIdSchema.safeParse("gold").success).toBe(false);
    expect(BillingCycleSchema.safeParse("weekly").success).toBe(false);
  });
});
