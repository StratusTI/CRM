import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "@/src/lib/result";

const { findDue, claim, updateStatus, publishScheduledPost } = vi.hoisted(
  () => ({
    findDue: vi.fn(),
    claim: vi.fn(),
    updateStatus: vi.fn(),
    publishScheduledPost: vi.fn(() => Promise.resolve()),
  }),
);

vi.mock("@/src/repositories/scheduled-post.repository", () => ({
  ScheduledPostRepository: { findDue, claim, updateStatus },
}));
vi.mock("@/src/services/scheduled-post.service", () => ({
  publishScheduledPost,
}));

import { databaseError } from "@/src/errors/app-error";
import { socialPostSchedulerTick } from "@/src/services/social-post-scheduler";

function post(id: string) {
  return { id, workspaceId: "ws1", createdById: "u1", targets: [], media: [] };
}

describe("socialPostSchedulerTick", () => {
  beforeEach(() => {
    findDue.mockReset();
    claim.mockReset();
    updateStatus.mockReset();
    publishScheduledPost.mockReset();
    publishScheduledPost.mockResolvedValue(undefined);
    updateStatus.mockResolvedValue(ok({}));
  });

  it("publica os posts vencidos que conseguiu reivindicar", async () => {
    findDue.mockResolvedValue(ok([post("p1"), post("p2")]));
    claim.mockResolvedValue(ok(true));

    const result = await socialPostSchedulerTick(new Date());

    expect(result).toEqual({ considered: 2, dispatched: 2, errors: 0 });
    expect(publishScheduledPost).toHaveBeenCalledTimes(2);
  });

  it("pula posts já reivindicados por outro tick (claim = false)", async () => {
    findDue.mockResolvedValue(ok([post("p1")]));
    claim.mockResolvedValue(ok(false));

    const result = await socialPostSchedulerTick(new Date());

    expect(result.dispatched).toBe(0);
    expect(publishScheduledPost).not.toHaveBeenCalled();
  });

  it("retorna erro quando a busca por vencidos falha", async () => {
    findDue.mockResolvedValue(err(databaseError()));

    const result = await socialPostSchedulerTick(new Date());

    expect(result).toEqual({ considered: 0, dispatched: 0, errors: 1 });
  });

  it("conta erro e marca FAILED quando publicar lança", async () => {
    findDue.mockResolvedValue(ok([post("p1")]));
    claim.mockResolvedValue(ok(true));
    publishScheduledPost.mockRejectedValueOnce(new Error("boom"));

    const result = await socialPostSchedulerTick(new Date());

    expect(result.errors).toBe(1);
    expect(updateStatus).toHaveBeenCalledWith(
      "p1",
      "FAILED",
      expect.objectContaining({ lastError: expect.any(String) }),
    );
  });
});
