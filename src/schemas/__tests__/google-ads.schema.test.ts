import { describe, expect, it } from "vitest";
import {
  GOOGLE_ADS_RANGE_DAYS,
  GoogleAdsInsightsRangeSchema,
  GoogleAdsInsightsSchema,
  GoogleAdsOverviewSchema,
} from "@/src/schemas/google-ads.schema";

describe("GoogleAdsOverviewSchema", () => {
  it("valida overview com totais", () => {
    expect(
      GoogleAdsOverviewSchema.safeParse({
        customerId: "123",
        customerName: null,
        currency: "BRL",
        totals: {
          impressions: 10,
          clicks: 2,
          costMicros: 1000,
          conversions: 1,
          ctr: 0.2,
        },
        activeCampaigns: 1,
      }).success,
    ).toBe(true);
  });

  it("rejeita métrica negativa", () => {
    expect(
      GoogleAdsOverviewSchema.safeParse({
        customerId: "123",
        customerName: null,
        currency: "BRL",
        totals: {
          impressions: -1,
          clicks: 0,
          costMicros: 0,
          conversions: 0,
          ctr: 0,
        },
        activeCampaigns: 0,
      }).success,
    ).toBe(false);
  });
});

describe("GoogleAdsInsightsRangeSchema", () => {
  it("default 30d", () => {
    expect(GoogleAdsInsightsRangeSchema.parse(undefined)).toBe("30d");
  });
  it("mapeia janelas para dias", () => {
    expect(GOOGLE_ADS_RANGE_DAYS["7d"]).toBe(7);
    expect(GOOGLE_ADS_RANGE_DAYS["90d"]).toBe(90);
  });
});

describe("GoogleAdsInsightsSchema", () => {
  it("valida insights com série", () => {
    expect(
      GoogleAdsInsightsSchema.safeParse({
        range: "7d",
        startDate: "2026-01-01",
        endDate: "2026-01-07",
        totals: {
          impressions: 5,
          clicks: 1,
          costMicros: 100,
          conversions: 0,
        },
        series: [
          {
            date: "2026-01-01",
            impressions: 5,
            clicks: 1,
            costMicros: 100,
            conversions: 0,
          },
        ],
      }).success,
    ).toBe(true);
  });
});
