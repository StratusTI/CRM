import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const dashboardRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  listByWorkspace: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/dashboard.repository", () => ({
  DashboardRepository: dashboardRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { DashboardService } from "@/src/services/dashboard.service";

const WS = "ws_1";

function dashboard(overrides: Record<string, unknown> = {}) {
  return {
    id: "d_1",
    title: "Vendas",
    pageLayoutId: null,
    workspaceId: WS,
    createdById: "user_1",
    updatedById: null,
    position: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS, slug: "acme" } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(dashboardRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("DashboardService.create", () => {
  it("cria escopado à workspace e ao criador", async () => {
    asMember();
    dashboardRepo.create.mockResolvedValue(ok(dashboard()));
    const result = await DashboardService.create("user_1", "acme", {
      title: "Vendas",
    });
    expect(result.ok).toBe(true);
    expect(dashboardRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WS, createdById: "user_1" }),
    );
  });

  it("WORKSPACE_NOT_FOUND para não-membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    const result = await DashboardService.create("user_1", "acme", {
      title: "Vendas",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(dashboardRepo.create).not.toHaveBeenCalled();
  });
});

describe("DashboardService.getById", () => {
  it("DASHBOARD_NOT_FOUND para outra workspace", async () => {
    asMember();
    dashboardRepo.findById.mockResolvedValue(
      ok(dashboard({ workspaceId: "ws_2" })),
    );
    const result = await DashboardService.getById("user_1", "acme", "d_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DASHBOARD_NOT_FOUND");
  });
});

describe("DashboardService.remove", () => {
  it("soft delete do dashboard", async () => {
    asMember();
    dashboardRepo.findById.mockResolvedValue(ok(dashboard()));
    dashboardRepo.softDelete.mockResolvedValue(
      ok(dashboard({ deletedAt: new Date() })),
    );
    const result = await DashboardService.remove("user_1", "acme", "d_1");
    expect(result.ok).toBe(true);
    expect(dashboardRepo.softDelete).toHaveBeenCalledWith("d_1", "user_1");
  });
});
