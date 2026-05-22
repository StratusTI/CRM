import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";
import { ChartConfigSchema } from "@/src/schemas/dashboard-widget.schema";

const widgetRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByDashboard: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  applyLayout: vi.fn(),
}));
const dashboardRepo = vi.hoisted(() => ({ findById: vi.fn() }));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/dashboard-widget.repository", () => ({
  DashboardWidgetRepository: widgetRepo,
}));
vi.mock("@/src/repositories/dashboard.repository", () => ({
  DashboardRepository: dashboardRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { DashboardWidgetService } from "@/src/services/dashboard-widget.service";

const WS = "ws_1";
const DASH = "d_1";

function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    id: DASH,
    title: "Vendas",
    pageLayoutId: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function widget(overrides: Record<string, unknown> = {}) {
  return {
    id: "w_1",
    dashboardId: DASH,
    type: "CHART",
    x: 0,
    y: 0,
    w: 4,
    h: 6,
    config: { chartType: "pie" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS, slug: "acme" } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(widgetRepo)) fn.mockReset();
  for (const fn of Object.values(dashboardRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("DashboardWidgetService.create", () => {
  it("cria o widget no dashboard do workspace", async () => {
    asMember();
    dashboardRepo.findById.mockResolvedValue(ok(dashboard()));
    widgetRepo.create.mockResolvedValue(ok(widget()));
    const result = await DashboardWidgetService.create("user_1", "acme", DASH, {
      type: "CHART",
      config: ChartConfigSchema.parse({ chartType: "pie" }),
      x: 0,
      y: 0,
      w: 4,
      h: 6,
    });
    expect(result.ok).toBe(true);
    expect(widgetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: DASH, type: "CHART" }),
    );
  });

  it("DASHBOARD_NOT_FOUND quando o dashboard é de outro workspace", async () => {
    asMember();
    dashboardRepo.findById.mockResolvedValue(
      ok(dashboard({ workspaceId: "ws_2" })),
    );
    const result = await DashboardWidgetService.create("user_1", "acme", DASH, {
      type: "IFRAME",
      config: { url: "https://example.com" },
      x: 0,
      y: 0,
      w: 4,
      h: 6,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DASHBOARD_NOT_FOUND");
    expect(widgetRepo.create).not.toHaveBeenCalled();
  });
});

describe("DashboardWidgetService.update", () => {
  it("valida config contra o tipo do widget existente", async () => {
    asMember();
    dashboardRepo.findById.mockResolvedValue(ok(dashboard()));
    widgetRepo.findById.mockResolvedValue(ok(widget({ type: "CHART" })));
    const result = await DashboardWidgetService.update(
      "user_1",
      "acme",
      DASH,
      "w_1",
      { config: { chartType: "donut" } },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(widgetRepo.update).not.toHaveBeenCalled();
  });

  it("DASHBOARD_WIDGET_NOT_FOUND quando o widget é de outro dashboard", async () => {
    asMember();
    dashboardRepo.findById.mockResolvedValue(ok(dashboard()));
    widgetRepo.findById.mockResolvedValue(
      ok(widget({ dashboardId: "d_other" })),
    );
    const result = await DashboardWidgetService.update(
      "user_1",
      "acme",
      DASH,
      "w_1",
      { w: 8 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe("DASHBOARD_WIDGET_NOT_FOUND");
  });
});
