import type { Dashboard } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toDashboardDTO } from "@/src/mappers/dashboard.mapper";

const base: Dashboard = {
  id: "d_1",
  title: "Vendas",
  pageLayoutId: "layout_1",
  workspaceId: "ws_1",
  createdById: "user_1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toDashboardDTO", () => {
  it("serializa datas e preserva nulos", () => {
    expect(toDashboardDTO(base)).toEqual({
      id: "d_1",
      title: "Vendas",
      pageLayoutId: "layout_1",
      workspaceId: "ws_1",
      createdById: "user_1",
      updatedById: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      deletedAt: null,
    });
  });
});
