import { describe, expect, it } from "vitest";
import {
  GoogleAnalyticsInsightsRangeSchema,
  GoogleAnalyticsInsightsSchema,
  GoogleAnalyticsOverviewSchema,
  INSIGHTS_RANGE_DAYS,
} from "@/src/schemas/google-analytics.schema";

describe("GoogleAnalyticsOverviewSchema", () => {
  it("valida overview", () => {
    expect(
      GoogleAnalyticsOverviewSchema.safeParse({
        propertyId: "properties/1",
        propertyName: "Site",
        accountName: null,
        totals: {
          activeUsers: 10,
          sessions: 20,
          screenPageViews: 30,
          eventCount: 40,
        },
      }).success,
    ).toBe(true);
  });
});

describe("GoogleAnalyticsInsightsRangeSchema", () => {
  it("default 28d e mapeia dias", () => {
    expect(GoogleAnalyticsInsightsRangeSchema.parse(undefined)).toBe("28d");
    expect(INSIGHTS_RANGE_DAYS["90d"]).toBe(90);
  });
});

describe("GoogleAnalyticsInsightsSchema", () => {
  it("valida insights com série", () => {
    expect(
      GoogleAnalyticsInsightsSchema.safeParse({
        range: "28d",
        startDate: "2026-01-01",
        endDate: "2026-01-28",
        totals: {
          activeUsers: 1,
          sessions: 2,
          screenPageViews: 3,
          eventCount: 4,
        },
        series: [
          {
            date: "2026-01-01",
            activeUsers: 1,
            sessions: 2,
            screenPageViews: 3,
          },
        ],
      }).success,
    ).toBe(true);
  });
});
