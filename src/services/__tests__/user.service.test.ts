import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userNotFound } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const repo = vi.hoisted(() => ({
  findById: vi.fn(),
  updateProfile: vi.fn(),
  acceptConsent: vi.fn(),
  scheduleDeletion: vi.fn(),
  cancelDeletion: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  listSoleOwnerWorkspaces: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/user.repository", () => ({
  UserRepository: repo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { UserService } from "@/src/services/user.service";

const user: User = {
  id: "user_1",
  name: "John",
  email: "john@example.com",
  emailVerified: true,
  image: null,
  deletionScheduledAt: null,
  anonymizedAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("UserService", () => {
  beforeEach(() => {
    for (const fn of Object.values(repo)) fn.mockReset();
    for (const fn of Object.values(memberRepo)) fn.mockReset();
    memberRepo.listSoleOwnerWorkspaces.mockResolvedValue(ok([]));
  });

  it("getMe retorna o DTO quando o usuário existe", async () => {
    repo.findById.mockResolvedValue(ok(user));
    const result = await UserService.getMe("user_1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe("user_1");
  });

  it("getMe propaga o erro do repositório", async () => {
    repo.findById.mockResolvedValue(err(userNotFound()));
    const result = await UserService.getMe("user_x");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("USER_NOT_FOUND");
  });

  it("acceptConsent grava ambos os aceites com a data atual", async () => {
    repo.acceptConsent.mockResolvedValue(
      ok({
        ...user,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
      }),
    );
    const result = await UserService.acceptConsent("user_1");
    expect(result.ok).toBe(true);
    expect(repo.acceptConsent).toHaveBeenCalledWith("user_1", expect.any(Date));
  });

  it("scheduleDeletion agenda uma data futura", async () => {
    repo.scheduleDeletion.mockResolvedValue(ok(user));
    await UserService.scheduleDeletion("user_1");
    const [, when] = repo.scheduleDeletion.mock.calls[0];
    expect((when as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it("scheduleDeletion bloqueia quando é único dono de uma workspace", async () => {
    memberRepo.listSoleOwnerWorkspaces.mockResolvedValue(
      ok([{ id: "ws_1", name: "Acme", slug: "acme" }]),
    );
    const result = await UserService.scheduleDeletion("user_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LAST_OWNER_PROTECTED");
    expect(repo.scheduleDeletion).not.toHaveBeenCalled();
  });

  it("exportData reúne perfil e vínculos", async () => {
    repo.findById.mockResolvedValue(ok(user));
    memberRepo.listByUser.mockResolvedValue(
      ok([
        { role: "OWNER", workspace: { name: "Acme", slug: "acme" } },
        { role: "MEMBER", workspace: { name: "Beta", slug: "beta" } },
      ]),
    );
    const result = await UserService.exportData("user_1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.id).toBe("user_1");
      expect(result.value.workspaces).toHaveLength(2);
      expect(result.value.workspaces[0]).toMatchObject({
        slug: "acme",
        role: "OWNER",
      });
    }
  });
});
