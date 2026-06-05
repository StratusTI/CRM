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
vi.mock("@/src/lib/social/google-analytics/client", () => client);

import { GoogleAnalyticsService } from "@/src/services/google-analytics.service";

function fresh(scope: string, externalAccountId = "properties/1") {
  return ok({
    accessToken: "ACCESS",
    connection: { scope, externalAccountId },
  });
}

beforeEach(() => {
  token.getFreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("GoogleAnalyticsService.getOverview", () => {
  it("SOCIAL_SCOPE_MISSING sem analytics.readonly", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh(""));
    const result = await GoogleAnalyticsService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("SOCIAL_CONNECTION_NOT_FOUND quando propertyId é unknown", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("analytics.readonly", "unknown"),
    );
    const result = await GoogleAnalyticsService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SOCIAL_CONNECTION_NOT_FOUND");
    }
  });

  it("busca o overview com o propertyId", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("analytics.readonly", "properties/9"),
    );
    client.fetchOverview.mockResolvedValue(ok({ propertyId: "properties/9" }));
    const result = await GoogleAnalyticsService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchOverview).toHaveBeenCalledWith("ACCESS", "properties/9");
  });
});

describe("GoogleAnalyticsService.getInsights", () => {
  it("traduz a janela em datas ISO", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("analytics.readonly", "properties/9"),
    );
    client.fetchInsights.mockResolvedValue(ok({ series: [] }));
    const result = await GoogleAnalyticsService.getInsights("u1", "acme", "7d");
    expect(result.ok).toBe(true);
    const [accessToken, propertyId, opts] = client.fetchInsights.mock.calls[0];
    expect(accessToken).toBe("ACCESS");
    expect(propertyId).toBe("properties/9");
    expect(opts.range).toBe("7d");
    expect(opts.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(opts.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
