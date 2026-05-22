import type { SocialConnection } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toSocialConnectionDTO } from "@/src/mappers/social-connection.mapper";

const base: SocialConnection = {
  id: "c1",
  platform: "INSTAGRAM",
  externalAccountId: "ext-1",
  accountName: "@acme",
  accessToken: "cipher-access",
  refreshToken: "cipher-refresh",
  tokenExpiresAt: new Date("2026-06-01T00:00:00.000Z"),
  scope: "instagram_business_basic",
  status: "CONNECTED",
  workspaceId: "ws1",
  createdById: "u1",
  updatedById: null,
  createdAt: new Date("2026-05-22T00:00:00.000Z"),
  updatedAt: new Date("2026-05-22T00:00:00.000Z"),
};

describe("toSocialConnectionDTO", () => {
  it("converte datas para ISO e mantém os campos públicos", () => {
    const dto = toSocialConnectionDTO(base);
    expect(dto.platform).toBe("INSTAGRAM");
    expect(dto.accountName).toBe("@acme");
    expect(dto.status).toBe("CONNECTED");
    expect(dto.expiresAt).toBe("2026-06-01T00:00:00.000Z");
    expect(dto.createdAt).toBe("2026-05-22T00:00:00.000Z");
  });

  it("nunca expõe access/refresh token", () => {
    const dto = toSocialConnectionDTO(base) as Record<string, unknown>;
    expect(dto.accessToken).toBeUndefined();
    expect(dto.refreshToken).toBeUndefined();
  });

  it("propaga expiresAt nulo", () => {
    expect(
      toSocialConnectionDTO({ ...base, tokenExpiresAt: null }).expiresAt,
    ).toBeNull();
  });
});
