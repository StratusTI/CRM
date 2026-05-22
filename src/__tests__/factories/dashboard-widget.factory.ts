import type { DashboardWidget, Prisma } from "@prisma/client";

type WidgetOverrides = Partial<
  Omit<Prisma.DashboardWidgetCreateInput, "dashboard">
>;

/** Cria um widget real no banco de testes, escopado a um dashboard. */
export async function createDashboardWidget(
  dashboardId: string,
  overrides: WidgetOverrides = {},
): Promise<DashboardWidget> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma.dashboardWidget.create({
    data: {
      type: overrides.type ?? "IFRAME",
      config: overrides.config ?? { url: "https://example.com" },
      ...overrides,
      dashboard: { connect: { id: dashboardId } },
    },
  });
}
