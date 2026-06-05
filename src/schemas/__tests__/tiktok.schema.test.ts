import { describe, expect, it } from "vitest";
import {
  PublishTiktokVideoResultSchema,
  PublishTiktokVideoSchema,
  TiktokCreatorOverviewSchema,
  TiktokPrivacySchema,
  TiktokVideosSchema,
} from "@/src/schemas/tiktok.schema";

describe("TiktokCreatorOverviewSchema", () => {
  it("valida overview do criador", () => {
    expect(
      TiktokCreatorOverviewSchema.safeParse({
        openId: "o",
        displayName: "Acme",
        bio: null,
        avatarUrl: null,
        profileLink: null,
        isVerified: false,
        followerCount: 0,
        followingCount: 0,
        likesCount: 0,
        videoCount: 0,
      }).success,
    ).toBe(true);
  });
});

describe("TiktokPrivacySchema", () => {
  it("default conservador SELF_ONLY", () => {
    expect(TiktokPrivacySchema.parse(undefined)).toBe("SELF_ONLY");
  });
  it("rejeita valor inválido", () => {
    expect(TiktokPrivacySchema.safeParse("PUBLIC").success).toBe(false);
  });
});

describe("PublishTiktokVideoSchema", () => {
  it("aplica defaults", () => {
    const parsed = PublishTiktokVideoSchema.parse({});
    expect(parsed.title).toBe("");
    expect(parsed.privacyLevel).toBe("SELF_ONLY");
    expect(parsed.disableComment).toBe(false);
    expect(parsed.disableDuet).toBe(false);
    expect(parsed.disableStitch).toBe(false);
  });

  it("rejeita título acima de 2200", () => {
    expect(
      PublishTiktokVideoSchema.safeParse({ title: "a".repeat(2201) }).success,
    ).toBe(false);
  });
});

describe("TiktokVideosSchema / result", () => {
  it("valida vídeos com totais", () => {
    expect(
      TiktokVideosSchema.safeParse({
        totals: { views: 1, likes: 2, comments: 3, shares: 4 },
        videos: [
          {
            id: "v",
            title: "T",
            coverImageUrl: null,
            shareUrl: null,
            duration: 10,
            createdAt: "",
            viewCount: 1,
            likeCount: 2,
            commentCount: 3,
            shareCount: 4,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("valida resultado de publicação", () => {
    expect(
      PublishTiktokVideoResultSchema.safeParse({
        publishId: "p",
        status: "PROCESSING_UPLOAD",
      }).success,
    ).toBe(true);
  });
});
