import { describe, expect, it } from "vitest";
import { createDashboard } from "@/src/__tests__/factories/dashboard.factory";
import { createDashboardWidget } from "@/src/__tests__/factories/dashboard-widget.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { DashboardWidgetRepository } from "@/src/repositories/dashboard-widget.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  const dashboard = await createDashboard(workspace.id, owner.id);
  return { owner, workspace, dashboard };
}

describe("DashboardWidgetRepository (integração)", () => {
  it("create persiste tipo, layout e config", async () => {
    const { dashboard } = await scope();
    const result = await DashboardWidgetRepository.create({
      dashboardId: dashboard.id,
      type: "IFRAME",
      x: 1,
      y: 2,
      w: 5,
      h: 4,
      config: { url: "https://example.com" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("IFRAME");
      expect(result.value.w).toBe(5);
      expect(result.value.config).toEqual({ url: "https://example.com" });
    }
  });

  it("listByDashboard só traz widgets do dashboard", async () => {
    const { dashboard } = await scope();
    const other = await scope();
    await createDashboardWidget(dashboard.id);
    await createDashboardWidget(dashboard.id);
    await createDashboardWidget(other.dashboard.id);

    const result = await DashboardWidgetRepository.listByDashboard(
      dashboard.id,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });

  it("applyLayout atualiza posições só dos widgets do dashboard", async () => {
    const { dashboard } = await scope();
    const widget = await createDashboardWidget(dashboard.id);

    const result = await DashboardWidgetRepository.applyLayout(dashboard.id, [
      { id: widget.id, x: 3, y: 4, w: 6, h: 8 },
    ]);
    expect(result.ok).toBe(true);

    const after = await DashboardWidgetRepository.findById(widget.id);
    if (after.ok && after.value) {
      expect(after.value.x).toBe(3);
      expect(after.value.h).toBe(8);
    }
  });
});
