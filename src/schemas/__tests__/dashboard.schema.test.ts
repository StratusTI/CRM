import { describe, expect, it } from "vitest";
import {
  CreateDashboardSchema,
  UpdateDashboardSchema,
} from "@/src/schemas/dashboard.schema";

describe("CreateDashboardSchema", () => {
  it("aceita título e pageLayoutId opcional", () => {
    const parsed = CreateDashboardSchema.safeParse({ title: "  Vendas  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Vendas");
      expect(parsed.data.pageLayoutId).toBeUndefined();
    }
  });

  it("rejeita título vazio", () => {
    expect(CreateDashboardSchema.safeParse({ title: "   " }).success).toBe(
      false,
    );
  });
});

describe("UpdateDashboardSchema", () => {
  it("permite limpar pageLayoutId com null", () => {
    const parsed = UpdateDashboardSchema.safeParse({ pageLayoutId: null });
    expect(parsed.success).toBe(true);
  });

  it("rejeita objeto vazio", () => {
    expect(UpdateDashboardSchema.safeParse({}).success).toBe(false);
  });

  it("não aceita título nulo", () => {
    expect(UpdateDashboardSchema.safeParse({ title: null }).success).toBe(
      false,
    );
  });
});
