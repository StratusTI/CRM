import { describe, expect, it } from "vitest";
import {
  IG_INSIGHTS_RANGE_DAYS,
  InstagramInsightsRangeSchema,
  InstagramInsightsSchema,
  InstagramMediaListSchema,
  InstagramProfileOverviewSchema,
  PublishInstagramPostResultSchema,
  PublishInstagramPostSchema,
} from "@/src/schemas/instagram.schema";

describe("InstagramProfileOverviewSchema", () => {
  it("valida overview completo", () => {
    expect(
      InstagramProfileOverviewSchema.safeParse({
        igAccountId: "1",
        username: "acme",
        name: null,
        biography: null,
        profilePictureUrl: null,
        mediaCount: 0,
        followersCount: 0,
        followsCount: 0,
      }).success,
    ).toBe(true);
  });
});

describe("InstagramInsightsRangeSchema", () => {
  it("default 28d e mapeia dias", () => {
    expect(InstagramInsightsRangeSchema.parse(undefined)).toBe("28d");
    expect(IG_INSIGHTS_RANGE_DAYS["7d"]).toBe(7);
  });
});

describe("InstagramInsightsSchema", () => {
  it("valida insights com série", () => {
    expect(
      InstagramInsightsSchema.safeParse({
        range: "7d",
        startDate: "2026-01-01",
        endDate: "2026-01-07",
        totals: { impressions: 1, reach: 2, profileViews: 3 },
        series: [
          { date: "2026-01-01", impressions: 1, reach: 2, profileViews: 3 },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("PublishInstagramPostSchema", () => {
  it("default caption vazia e trima", () => {
    expect(PublishInstagramPostSchema.parse({}).caption).toBe("");
    expect(PublishInstagramPostSchema.parse({ caption: " oi " }).caption).toBe(
      "oi",
    );
  });

  it("rejeita caption acima de 2200", () => {
    expect(
      PublishInstagramPostSchema.safeParse({ caption: "a".repeat(2201) })
        .success,
    ).toBe(false);
  });

  it("default postType FEED e aceita REELS/STORIES", () => {
    expect(PublishInstagramPostSchema.parse({}).postType).toBe("FEED");
    expect(
      PublishInstagramPostSchema.parse({ postType: "REELS" }).postType,
    ).toBe("REELS");
    expect(
      PublishInstagramPostSchema.safeParse({ postType: "LIVE" }).success,
    ).toBe(false);
  });
});

describe("PublishInstagramPostResultSchema / media list", () => {
  it("valida resultado e lista de mídia", () => {
    expect(
      PublishInstagramPostResultSchema.safeParse({
        postId: "1",
        permalink: null,
      }).success,
    ).toBe(true);
    expect(
      InstagramMediaListSchema.safeParse({
        media: [
          {
            id: "1",
            mediaType: "IMAGE",
            mediaUrl: null,
            thumbnailUrl: null,
            caption: null,
            timestamp: "2026-01-01",
            permalink: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejeita mediaType inválido", () => {
    expect(
      InstagramMediaListSchema.safeParse({
        media: [
          {
            id: "1",
            mediaType: "GIF",
            mediaUrl: null,
            thumbnailUrl: null,
            caption: null,
            timestamp: "2026-01-01",
            permalink: null,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
