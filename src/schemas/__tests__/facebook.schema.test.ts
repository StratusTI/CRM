import { describe, expect, it } from "vitest";
import {
  FacebookInsightsRangeSchema,
  FacebookPageOverviewSchema,
  FB_INSIGHTS_RANGE_DAYS,
  PublishPostSchema,
} from "@/src/schemas/facebook.schema";

describe("FacebookPageOverviewSchema", () => {
  const base = {
    pageId: "123",
    name: "Acme",
    about: null,
    link: "https://facebook.com/acme",
    pictureUrl: null,
    fanCount: 10,
    followersCount: 12,
  };

  it("valida um overview completo", () => {
    expect(FacebookPageOverviewSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita contagem negativa", () => {
    expect(
      FacebookPageOverviewSchema.safeParse({ ...base, fanCount: -1 }).success,
    ).toBe(false);
  });
});

describe("FacebookInsightsRangeSchema", () => {
  it("usa 28d como default", () => {
    expect(FacebookInsightsRangeSchema.parse(undefined)).toBe("28d");
  });

  it("não aceita 365d (Facebook limita a janela)", () => {
    expect(FacebookInsightsRangeSchema.safeParse("365d").success).toBe(false);
  });

  it("tem dias mapeados para todas as janelas", () => {
    for (const range of ["7d", "28d", "90d"] as const) {
      expect(FB_INSIGHTS_RANGE_DAYS[range]).toBeGreaterThan(0);
    }
  });
});

describe("PublishPostSchema", () => {
  it("aceita só mensagem", () => {
    const result = PublishPostSchema.safeParse({ message: "Olá" });
    expect(result.success).toBe(true);
  });

  it("aceita só link", () => {
    const result = PublishPostSchema.safeParse({
      link: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita publicação sem mensagem nem link", () => {
    expect(PublishPostSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita link inválido", () => {
    expect(
      PublishPostSchema.safeParse({ message: "x", link: "not-a-url" }).success,
    ).toBe(false);
  });
});
