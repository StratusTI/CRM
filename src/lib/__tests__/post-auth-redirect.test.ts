import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const { listByUser } = vi.hoisted(() => ({ listByUser: vi.fn() }));
const { readPendingInvite, clearPendingInvite } = vi.hoisted(() => ({
  readPendingInvite: vi.fn(),
  clearPendingInvite: vi.fn(),
}));

vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: { listByUser },
}));
vi.mock("@/src/lib/pending-invite", () => ({
  readPendingInvite,
  clearPendingInvite,
}));

import {
  ONBOARDING_PATH,
  resolveWorkspacePath,
} from "@/src/lib/post-auth-redirect";

describe("resolveWorkspacePath", () => {
  beforeEach(() => {
    listByUser.mockReset();
    readPendingInvite.mockReset();
    readPendingInvite.mockResolvedValue(null);
    clearPendingInvite.mockReset();
    clearPendingInvite.mockResolvedValue(undefined);
  });

  it("retorna /[slug] da membership mais antiga do usuário", async () => {
    listByUser.mockResolvedValue(
      ok([{ workspace: { slug: "acme" } }, { workspace: { slug: "outra" } }]),
    );

    await expect(resolveWorkspacePath("user_1")).resolves.toBe("/acme");
    expect(listByUser).toHaveBeenCalledWith("user_1");
  });

  it("redireciona para o onboarding quando não há membership", async () => {
    listByUser.mockResolvedValue(ok([]));

    await expect(resolveWorkspacePath("user_1")).resolves.toBe(ONBOARDING_PATH);
  });

  it("cai no onboarding quando o repositório falha", async () => {
    listByUser.mockResolvedValue({
      ok: false,
      error: { code: "DATABASE_ERROR", message: "x" },
    });

    await expect(resolveWorkspacePath("user_1")).resolves.toBe(ONBOARDING_PATH);
  });

  it("redireciona pra /invite/<token> quando há cookie pending_invite", async () => {
    readPendingInvite.mockResolvedValue("tok-pending");

    await expect(resolveWorkspacePath("user_1")).resolves.toBe(
      "/invite/tok-pending",
    );
    expect(clearPendingInvite).toHaveBeenCalledOnce();
    expect(listByUser).not.toHaveBeenCalled();
  });
});
