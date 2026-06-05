import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByWorkspaceId: vi.fn(),
}));
const oppRepo = vi.hoisted(() => ({ listOpenAndWonWithStage: vi.fn() }));
const quotaRepo = vi.hoisted(() => ({ listByWorkspaceAndPeriod: vi.fn() }));

vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/repositories/opportunity.repository", () => ({
  OpportunityRepository: oppRepo,
}));
vi.mock("@/src/repositories/quota.repository", () => ({
  QuotaRepository: quotaRepo,
}));

import { ForecastService } from "@/src/services/forecast.service";

const WS = "ws_1";

function member(id: string, name: string) {
  return { user: { id, name, email: `${id}@x.com` } };
}

function opp(overrides: Record<string, unknown>) {
  return {
    id: "o",
    ownerId: "u_1",
    amount: new Prisma.Decimal("1000"),
    closeDate: new Date("2026-06-15T00:00:00.000Z"),
    workspaceId: WS,
    deletedAt: null,
    stage: { category: "OPEN", probability: 50 },
    ...overrides,
  };
}

beforeEach(() => {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m", workspace: { id: WS, slug: "acme" } }),
  );
  memberRepo.listByWorkspaceId.mockResolvedValue(
    ok([member("u_1", "Ana"), member("u_2", "Beto")]),
  );
  quotaRepo.listByWorkspaceAndPeriod.mockResolvedValue(ok([]));
});

describe("ForecastService.getForecast", () => {
  it("pondera abertas e soma ganhas no mesmo período/owner", async () => {
    oppRepo.listOpenAndWonWithStage.mockResolvedValue(
      ok([
        // aberta: 1000 × 50% = 500
        opp({ stage: { category: "OPEN", probability: 50 } }),
        // ganha: soma cheia 2000
        opp({
          amount: new Prisma.Decimal("2000"),
          stage: { category: "WON", probability: 100 },
        }),
      ]),
    );

    const result = await ForecastService.getForecast("u_1", "acme", "MONTH");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows).toHaveLength(1);
    const row = result.value.rows[0];
    expect(row.periodKey).toBe("2026-06");
    expect(row.weightedOpenAmount).toBe(500);
    expect(row.wonAmount).toBe(2000);
    expect(row.forecastAmount).toBe(2500);
    expect(row.openCount).toBe(1);
    expect(row.wonCount).toBe(1);
  });

  it("calcula atingimento contra a meta", async () => {
    oppRepo.listOpenAndWonWithStage.mockResolvedValue(
      ok([
        opp({
          amount: new Prisma.Decimal("5000"),
          stage: { category: "WON", probability: 100 },
        }),
      ]),
    );
    quotaRepo.listByWorkspaceAndPeriod.mockResolvedValue(
      ok([
        {
          ownerId: "u_1",
          periodKey: "2026-06",
          targetAmount: new Prisma.Decimal("10000"),
        },
      ]),
    );

    const result = await ForecastService.getForecast("u_1", "acme", "MONTH");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = result.value.rows[0];
    expect(row.quotaAmount).toBe(10000);
    expect(row.attainmentPct).toBe(50);
  });

  it("agrupa por trimestre quando period=QUARTER", async () => {
    oppRepo.listOpenAndWonWithStage.mockResolvedValue(
      ok([
        opp({ closeDate: new Date("2026-04-10T00:00:00.000Z") }),
        opp({ closeDate: new Date("2026-05-20T00:00:00.000Z") }),
      ]),
    );
    const result = await ForecastService.getForecast("u_1", "acme", "QUARTER");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows).toHaveLength(1);
    expect(result.value.rows[0].periodKey).toBe("2026-Q2");
  });

  it("cria linha só com meta mesmo sem oportunidades", async () => {
    oppRepo.listOpenAndWonWithStage.mockResolvedValue(ok([]));
    quotaRepo.listByWorkspaceAndPeriod.mockResolvedValue(
      ok([
        {
          ownerId: "u_2",
          periodKey: "2026-07",
          targetAmount: new Prisma.Decimal("3000"),
        },
      ]),
    );
    const result = await ForecastService.getForecast("u_1", "acme", "MONTH");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = result.value.rows[0];
    expect(row.ownerName).toBe("Beto");
    expect(row.forecastAmount).toBe(0);
    expect(row.quotaAmount).toBe(3000);
    expect(row.attainmentPct).toBe(0);
  });
});
