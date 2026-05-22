import { describe, expect, it } from "vitest";
import {
  INSIGHTS_RANGE_DAYS,
  PublishVideoSchema,
  YoutubeChannelOverviewSchema,
  YoutubeInsightsRangeSchema,
} from "@/src/schemas/youtube.schema";

describe("YoutubeChannelOverviewSchema", () => {
  const base = {
    channelId: "UC123",
    title: "Acme",
    description: null,
    customUrl: "@acme",
    thumbnailUrl: null,
    subscriberCount: 10,
    viewCount: 100,
    videoCount: 5,
  };

  it("valida um overview completo", () => {
    expect(YoutubeChannelOverviewSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita contagem negativa", () => {
    expect(
      YoutubeChannelOverviewSchema.safeParse({ ...base, subscriberCount: -1 })
        .success,
    ).toBe(false);
  });
});

describe("YoutubeInsightsRangeSchema", () => {
  it("usa 28d como default", () => {
    expect(YoutubeInsightsRangeSchema.parse(undefined)).toBe("28d");
  });

  it("rejeita janela desconhecida", () => {
    expect(YoutubeInsightsRangeSchema.safeParse("13d").success).toBe(false);
  });

  it("tem dias mapeados para todas as janelas", () => {
    for (const range of ["7d", "28d", "90d", "365d"] as const) {
      expect(INSIGHTS_RANGE_DAYS[range]).toBeGreaterThan(0);
    }
  });
});

describe("PublishVideoSchema", () => {
  it("aplica defaults (privado, sem tags, descrição vazia)", () => {
    const result = PublishVideoSchema.parse({ title: "Meu vídeo" });
    expect(result).toMatchObject({
      title: "Meu vídeo",
      description: "",
      privacyStatus: "private",
      tags: [],
    });
  });

  it("exige título não vazio", () => {
    expect(PublishVideoSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejeita título acima de 100 caracteres", () => {
    expect(
      PublishVideoSchema.safeParse({ title: "a".repeat(101) }).success,
    ).toBe(false);
  });
});
