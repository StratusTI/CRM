import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const activityRepo = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/src/repositories/activity.repository", () => ({
  ActivityRepository: activityRepo,
}));

import { recordActivity } from "@/src/services/activity-recorder";

beforeEach(() => {
  activityRepo.create.mockReset().mockResolvedValue(ok({ id: "a1" }));
});

describe("recordActivity", () => {
  it("usa o próprio id como vínculo quando a entidade é company", async () => {
    await recordActivity({
      workspaceId: "ws_1",
      actingUserId: "u1",
      entity: "company",
      event: "created",
      record: { id: "co_1", name: "Acme" },
    });
    const arg = activityRepo.create.mock.calls[0][0];
    expect(arg.companyId).toBe("co_1");
    expect(arg.action).toBe("CREATED");
    expect(arg.summary).toContain("Acme");
  });

  it("extrai FKs de uma oportunidade (company/person via pointOfContact)", async () => {
    await recordActivity({
      workspaceId: "ws_1",
      actingUserId: "u1",
      entity: "opportunity",
      event: "updated",
      record: {
        id: "op_1",
        name: "Deal",
        companyId: "co_9",
        pointOfContactId: "p_9",
      },
      changedFields: ["stageId"],
    });
    const arg = activityRepo.create.mock.calls[0][0];
    expect(arg.opportunityId).toBe("op_1");
    expect(arg.companyId).toBe("co_9");
    expect(arg.personId).toBe("p_9");
    expect(arg.changedFields).toEqual(["stageId"]);
  });

  it("não lança quando o repositório falha (best-effort)", async () => {
    activityRepo.create.mockRejectedValue(new Error("db down"));
    await expect(
      recordActivity({
        workspaceId: "ws_1",
        actingUserId: "u1",
        entity: "note",
        event: "deleted",
        record: { id: "n_1" },
      }),
    ).resolves.toBeUndefined();
  });

  it("ignora record sem id (nada a rastrear)", async () => {
    await recordActivity({
      workspaceId: "ws_1",
      actingUserId: "u1",
      entity: "task",
      event: "created",
      record: {},
    });
    expect(activityRepo.create).not.toHaveBeenCalled();
  });
});
