import type { SocialConnection } from "@prisma/client";
import {
  socialConnectionNotFound,
  socialScopeMissing,
} from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchInsights,
  fetchOverview,
} from "@/src/lib/social/google-ads/client";
import type {
  GoogleAdsInsights,
  GoogleAdsInsightsRange,
  GoogleAdsOverview,
} from "@/src/schemas/google-ads.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

const REQUIRED_SCOPE = "adwords";

function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

function resolveCustomerId(connection: SocialConnection): string | null {
  const id = connection.externalAccountId;
  return id && id !== "unknown" ? id : null;
}

export const GoogleAdsService = {
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<GoogleAdsOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "GOOGLE_ADS");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPE)) {
      return err(socialScopeMissing());
    }
    const customerId = resolveCustomerId(fresh.value.connection);
    if (!customerId) return err(socialConnectionNotFound());

    return fetchOverview(fresh.value.accessToken, customerId);
  },

  async getInsights(
    userId: string,
    slug: string,
    range: GoogleAdsInsightsRange,
  ): Promise<Result<GoogleAdsInsights>> {
    const fresh = await getFreshAccessToken(userId, slug, "GOOGLE_ADS");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPE)) {
      return err(socialScopeMissing());
    }
    const customerId = resolveCustomerId(fresh.value.connection);
    if (!customerId) return err(socialConnectionNotFound());

    return fetchInsights(fresh.value.accessToken, customerId, range);
  },
};
