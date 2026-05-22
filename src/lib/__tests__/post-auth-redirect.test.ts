import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const { listByUser } = vi.hoisted(() => ({ listByUser: vi.fn() }));

vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: { listByUser },
}));

import {
  ONBOARDING_PATH,
  resolveWorkspacePath,
} from "@/src/lib/post-auth-redirect";

describe("resolveWorkspacePath", () => {
  beforeEach(() => {
    listByUser.mockReset();
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
});
