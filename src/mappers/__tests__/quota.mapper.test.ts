import type { Quota } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toQuotaDTO } from "@/src/mappers/quota.mapper";

const base: Quota = {
  id: "q_1",
  workspaceId: "ws_1",
  ownerId: "u_1",
  period: "QUARTER",
  periodKey: "2026-Q2",
  targetAmount: new Prisma.Decimal("15000.00"),
  createdById: "u_1",
  updatedById: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("toQuotaDTO", () => {
  it("converte Decimal em number e datas em ISO", () => {
    const dto = toQuotaDTO(base);
    expect(dto.targetAmount).toBe(15000);
    expect(dto.period).toBe("QUARTER");
    expect(dto.periodKey).toBe("2026-Q2");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
