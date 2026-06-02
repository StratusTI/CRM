import type { Opportunity } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toOpportunityDTO } from "@/src/mappers/opportunity.mapper";

const base: Opportunity = {
  id: "op_1",
  name: "Deal",
  amount: new Prisma.Decimal("50000.00"),
  closeDate: new Date("2026-06-01T00:00:00.000Z"),
  stage: "PROPOSAL",
  companyId: "co_1",
  pointOfContactId: "p_1",
  ownerId: "user_1",
  source: null,
  workspaceId: "ws_1",
  createdById: "user_1",
  updatedById: null,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

describe("toOpportunityDTO", () => {
  it("converte amount Decimal e datas em ISO", () => {
    const dto = toOpportunityDTO(base);
    expect(dto.amount).toBe(50000);
    expect(dto.closeDate).toBe("2026-06-01T00:00:00.000Z");
    expect(dto.stage).toBe("PROPOSAL");
  });

  it("preserva nulos", () => {
    const dto = toOpportunityDTO({ ...base, amount: null, closeDate: null });
    expect(dto.amount).toBeNull();
    expect(dto.closeDate).toBeNull();
  });
});
