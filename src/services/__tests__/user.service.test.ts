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

vi.mock("@/src/repositories/user.repository", () => ({
  UserRepository: repo,
}));

import { UserService } from "@/src/services/user.service";

const user: User = {
  id: "user_1",
  name: "John",
  email: "john@example.com",
  emailVerified: true,
  image: null,
  deletionScheduledAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("UserService", () => {
  beforeEach(() => {
    for (const fn of Object.values(repo)) fn.mockReset();
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
});
