import type { DashboardWidget } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toDashboardWidgetDTO } from "@/src/mappers/dashboard-widget.mapper";

const base: DashboardWidget = {
  id: "w_1",
  dashboardId: "d_1",
  type: "CHART",
  x: 0,
  y: 2,
  w: 4,
  h: 6,
  config: { chartType: "pie" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("toDashboardWidgetDTO", () => {
  it("serializa datas e preserva layout/config", () => {
    expect(toDashboardWidgetDTO(base)).toEqual({
      id: "w_1",
      dashboardId: "d_1",
      type: "CHART",
      x: 0,
      y: 2,
      w: 4,
      h: 6,
      config: { chartType: "pie" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});
