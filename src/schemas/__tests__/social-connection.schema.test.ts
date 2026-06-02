import { describe, expect, it } from "vitest";
import {
  SOCIAL_PLATFORMS,
  SocialConnectionOutputSchema,
  SocialPlatformSchema,
} from "@/src/schemas/social-connection.schema";

describe("SocialPlatformSchema", () => {
  it("aceita as plataformas suportadas", () => {
    for (const platform of [
      "INSTAGRAM",
      "FACEBOOK",
      "TIKTOK",
      "YOUTUBE",
      "GOOGLE_ANALYTICS",
    ]) {
      expect(SocialPlatformSchema.safeParse(platform).success).toBe(true);
    }
  });

  it("rejeita plataforma desconhecida", () => {
    expect(SocialPlatformSchema.safeParse("twitter").success).toBe(false);
  });

  it("expõe a lista canônica de plataformas", () => {
    expect(SOCIAL_PLATFORMS).toEqual([
      "INSTAGRAM",
      "FACEBOOK",
      "TIKTOK",
      "YOUTUBE",
      "GOOGLE_ANALYTICS",
      "TWITTER",
      "GOOGLE_ADS",
      "LINKEDIN",
    ]);
  });
});

describe("SocialConnectionOutputSchema", () => {
  const base = {
    id: "c1",
    workspaceId: "ws1",
    platform: "INSTAGRAM" as const,
    accountName: "@acme",
    externalAccountId: "123",
    scope: "user_profile",
    status: "CONNECTED" as const,
    expiresAt: "2026-06-01T00:00:00.000Z",
    createdById: "u1",
    updatedById: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
  };

  it("valida um DTO completo", () => {
    expect(SocialConnectionOutputSchema.safeParse(base).success).toBe(true);
  });

  it("aceita accountName/scope/expiresAt nulos", () => {
    const result = SocialConnectionOutputSchema.safeParse({
      ...base,
      accountName: null,
      scope: null,
      expiresAt: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando faltam campos obrigatórios", () => {
    const withoutExternal: Record<string, unknown> = { ...base };
    delete withoutExternal.externalAccountId;
    expect(
      SocialConnectionOutputSchema.safeParse(withoutExternal).success,
    ).toBe(false);
  });
});
