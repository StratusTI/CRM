import type { Subscription } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  FREE_SUBSCRIPTION_DTO,
  toSubscriptionDTO,
} from "@/src/mappers/subscription.mapper";

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_1",
    workspaceId: "ws_1",
    plan: "pro",
    cycle: "yearly",
    status: "ACTIVE",
    seats: 5,
    currentPeriodEnd: new Date("2026-12-31T00:00:00.000Z"),
    cancelAtPeriodEnd: false,
    abacateCustomerId: null,
    abacateSubscriptionId: null,
    abacateProductId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("toSubscriptionDTO", () => {
  it("retorna o DTO de Free quando não há assinatura", () => {
    expect(toSubscriptionDTO(null)).toEqual(FREE_SUBSCRIPTION_DTO);
  });

  it("mapeia os campos da assinatura e serializa a data", () => {
    const dto = toSubscriptionDTO(makeSub());
    expect(dto).toEqual({
      plan: "pro",
      cycle: "yearly",
      status: "ACTIVE",
      seats: 5,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-12-31T00:00:00.000Z",
    });
  });

  it("faz fallback para free/monthly quando o valor salvo é inválido", () => {
    const dto = toSubscriptionDTO(
      makeSub({ plan: "legacy_gold", cycle: "weekly" }),
    );
    expect(dto.plan).toBe("free");
    expect(dto.cycle).toBe("monthly");
  });

  it("aceita período de cobrança nulo", () => {
    const dto = toSubscriptionDTO(makeSub({ currentPeriodEnd: null }));
    expect(dto.currentPeriodEnd).toBeNull();
  });
});
