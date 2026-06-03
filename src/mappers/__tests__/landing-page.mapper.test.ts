import type { LandingPage } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toLandingPageDTO,
  toLandingPageListItemDTO,
  toLandingPageMetricsDTO,
  toPublicLandingPageDTO,
} from "@/src/mappers/landing-page.mapper";

const basePage: LandingPage = {
  id: "lp1",
  title: "Promo",
  slug: "promo",
  html: "<html></html>",
  status: "PUBLISHED",
  publishedAt: new Date("2026-01-02T00:00:00.000Z"),
  workspaceId: "w1",
  createdById: "u1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  deletedAt: null,
};

describe("toLandingPageDTO", () => {
  it("serializa datas em ISO e preserva nulos", () => {
    const dto = toLandingPageDTO(basePage);
    expect(dto.publishedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.deletedAt).toBeNull();
    expect(dto.viewsCount).toBeUndefined();
  });
});

describe("toLandingPageListItemDTO", () => {
  it("inclui viewsCount do _count", () => {
    const dto = toLandingPageListItemDTO({
      ...basePage,
      _count: { views: 12 },
    });
    expect(dto.viewsCount).toBe(12);
  });
});

describe("toPublicLandingPageDTO", () => {
  it("expõe só id/título/html", () => {
    const dto = toPublicLandingPageDTO(basePage);
    expect(dto).toEqual({ id: "lp1", title: "Promo", html: "<html></html>" });
  });
});

describe("toLandingPageMetricsDTO", () => {
  it("repassa agregados e origens", () => {
    const dto = toLandingPageMetricsDTO({
      totalViews: 10,
      avgDurationMs: 4200,
      totalCtaClicks: 3,
      referrers: [
        { referrer: "https://google.com", count: 6 },
        { referrer: null, count: 4 },
      ],
    });
    expect(dto.totalViews).toBe(10);
    expect(dto.avgDurationMs).toBe(4200);
    expect(dto.totalCtaClicks).toBe(3);
    expect(dto.referrers).toHaveLength(2);
    expect(dto.referrers[0]).toEqual({
      referrer: "https://google.com",
      count: 6,
    });
  });
});
