import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const token = vi.hoisted(() => ({ getFreshAccessToken: vi.fn() }));
const client = vi.hoisted(() => ({
  fetchOverview: vi.fn(),
  fetchInsights: vi.fn(),
}));

vi.mock("@/src/services/social-token", () => ({
  getFreshAccessToken: token.getFreshAccessToken,
}));
vi.mock("@/src/lib/social/google-ads/client", () => client);

import { GoogleAdsService } from "@/src/services/google-ads.service";

function fresh(scope: string, externalAccountId = "123") {
  return ok({
    accessToken: "ACCESS",
    connection: { scope, externalAccountId },
  });
}

beforeEach(() => {
  token.getFreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("GoogleAdsService.getOverview", () => {
  it("SOCIAL_SCOPE_MISSING sem adwords", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh(""));
    const result = await GoogleAdsService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("SOCIAL_CONNECTION_NOT_FOUND quando customerId é unknown", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("adwords", "unknown"));
    const result = await GoogleAdsService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SOCIAL_CONNECTION_NOT_FOUND");
    }
  });

  it("chama o client com o customerId", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("adwords", "555"));
    client.fetchOverview.mockResolvedValue(ok({ customerId: "555" }));
    const result = await GoogleAdsService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchOverview).toHaveBeenCalledWith("ACCESS", "555");
  });
});

describe("GoogleAdsService.getInsights", () => {
  it("repassa range e customerId", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("adwords", "555"));
    client.fetchInsights.mockResolvedValue(ok({ series: [] }));
    const result = await GoogleAdsService.getInsights("u1", "acme", "30d");
    expect(result.ok).toBe(true);
    expect(client.fetchInsights).toHaveBeenCalledWith("ACCESS", "555", "30d");
  });
});
