import type { Activity } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toActivityDTO } from "@/src/mappers/activity.mapper";

const base: Activity = {
  id: "act_1",
  workspaceId: "ws_1",
  actorUserId: "user_1",
  action: "UPDATED",
  entity: "company",
  entityId: "co_1",
  companyId: "co_1",
  personId: null,
  opportunityId: null,
  changedFields: ["name", "domain"],
  data: { id: "co_1", name: "Acme" },
  summary: "atualizou Empresa Acme",
  createdAt: new Date("2026-06-05T12:00:00.000Z"),
};

describe("toActivityDTO", () => {
  it("mapeia campos e data em ISO; omite o snapshot `data`", () => {
    const dto = toActivityDTO(base);
    expect(dto.action).toBe("UPDATED");
    expect(dto.entity).toBe("company");
    expect(dto.changedFields).toEqual(["name", "domain"]);
    expect(dto.summary).toBe("atualizou Empresa Acme");
    expect(dto.createdAt).toBe("2026-06-05T12:00:00.000Z");
    expect("data" in dto).toBe(false);
  });
});
