import type { Product } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toProductDTO } from "@/src/mappers/product.mapper";

const base: Product = {
  id: "pr_1",
  workspaceId: "ws_1",
  name: "Plano Pro",
  sku: "PRO-001",
  description: null,
  unitPrice: new Prisma.Decimal("199.90"),
  currency: "BRL",
  billingType: "MONTHLY",
  active: true,
  position: 1,
  createdById: "user_1",
  updatedById: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toProductDTO", () => {
  it("converte Decimal em number e datas em ISO", () => {
    const dto = toProductDTO(base);
    expect(dto.unitPrice).toBe(199.9);
    expect(dto.billingType).toBe("MONTHLY");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.deletedAt).toBeNull();
  });
});
