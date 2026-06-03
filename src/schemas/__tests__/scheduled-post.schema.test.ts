import { describe, expect, it } from "vitest";
import {
  CreateScheduledPostInputSchema,
  INSTAGRAM_POST_TYPE_MEDIA,
  PLATFORM_MEDIA_REQUIREMENT,
  PLATFORM_TEXT_LIMIT,
  RescheduleInputSchema,
  ScheduledPostDTOSchema,
  ScheduledPostOptionsSchema,
} from "@/src/schemas/scheduled-post.schema";

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe("CreateScheduledPostInputSchema", () => {
  it("aceita publicação imediata sem scheduledFor", () => {
    const parsed = CreateScheduledPostInputSchema.safeParse({
      platforms: ["TWITTER"],
      mode: "now",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.content).toBe("");
      expect(parsed.data.options).toEqual({});
    }
  });

  it("exige ao menos uma plataforma", () => {
    const parsed = CreateScheduledPostInputSchema.safeParse({
      platforms: [],
      mode: "now",
    });
    expect(parsed.success).toBe(false);
  });

  it("exige scheduledFor quando mode = schedule", () => {
    const parsed = CreateScheduledPostInputSchema.safeParse({
      platforms: ["TWITTER"],
      mode: "schedule",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toContain("scheduledFor");
    }
  });

  it("rejeita agendamento no passado", () => {
    const parsed = CreateScheduledPostInputSchema.safeParse({
      platforms: ["TWITTER"],
      mode: "schedule",
      scheduledFor: PAST,
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita agendamento no futuro", () => {
    const parsed = CreateScheduledPostInputSchema.safeParse({
      platforms: ["INSTAGRAM", "TIKTOK"],
      content: "  oi  ",
      mode: "schedule",
      scheduledFor: FUTURE,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.content).toBe("oi");
  });

  it("rejeita plataforma não publicável", () => {
    const parsed = CreateScheduledPostInputSchema.safeParse({
      platforms: ["GOOGLE_ADS"],
      mode: "now",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("ScheduledPostOptionsSchema", () => {
  it("aplica defaults por plataforma", () => {
    const parsed = ScheduledPostOptionsSchema.parse({
      youtube: {},
      tiktok: {},
    });
    expect(parsed.youtube?.privacy).toBe("public");
    expect(parsed.youtube?.tags).toEqual([]);
    expect(parsed.tiktok?.privacy).toBe("SELF_ONLY");
    expect(parsed.tiktok?.disableComment).toBe(false);
  });

  it("default vazio quando ausente", () => {
    expect(ScheduledPostOptionsSchema.parse(undefined)).toEqual({});
  });

  it("aplica default FEED ao postType do Instagram", () => {
    const parsed = ScheduledPostOptionsSchema.parse({ instagram: {} });
    expect(parsed.instagram?.postType).toBe("FEED");
  });

  it("aceita os modelos de post do Instagram", () => {
    const parsed = ScheduledPostOptionsSchema.parse({
      instagram: { postType: "REELS" },
    });
    expect(parsed.instagram?.postType).toBe("REELS");
  });

  it("rejeita modelo de post do Instagram inválido", () => {
    const parsed = ScheduledPostOptionsSchema.safeParse({
      instagram: { postType: "TIMELINE" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("INSTAGRAM_POST_TYPE_MEDIA", () => {
  it("mapeia mídia exigida por modelo de post", () => {
    expect(INSTAGRAM_POST_TYPE_MEDIA.FEED).toBe("image");
    expect(INSTAGRAM_POST_TYPE_MEDIA.REELS).toBe("video");
    expect(INSTAGRAM_POST_TYPE_MEDIA.STORIES).toBe("either");
  });
});

describe("RescheduleInputSchema", () => {
  it("aceita data futura", () => {
    expect(
      RescheduleInputSchema.safeParse({ scheduledFor: FUTURE }).success,
    ).toBe(true);
  });

  it("rejeita data passada", () => {
    expect(
      RescheduleInputSchema.safeParse({ scheduledFor: PAST }).success,
    ).toBe(false);
  });
});

describe("tabelas de plataforma", () => {
  it("expõe requisito de mídia e limite de texto", () => {
    expect(PLATFORM_MEDIA_REQUIREMENT.INSTAGRAM).toBe("image");
    expect(PLATFORM_MEDIA_REQUIREMENT.TIKTOK).toBe("video");
    expect(PLATFORM_TEXT_LIMIT.TWITTER).toBe(280);
  });
});

describe("ScheduledPostDTOSchema", () => {
  it("valida um DTO completo", () => {
    const parsed = ScheduledPostDTOSchema.safeParse({
      id: "sp_1",
      content: "oi",
      title: null,
      status: "SCHEDULED",
      scheduledFor: FUTURE,
      publishedAt: null,
      lastError: null,
      workspaceId: "ws_1",
      createdById: "u_1",
      createdAt: FUTURE,
      updatedAt: FUTURE,
      targets: [
        {
          id: "t_1",
          platform: "TWITTER",
          status: "PENDING",
          externalPostId: null,
          error: null,
          attempts: 0,
          publishedAt: null,
        },
      ],
      media: [
        {
          id: "m_1",
          kind: "IMAGE",
          contentType: "image/png",
          sizeBytes: 1024,
          order: 0,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
