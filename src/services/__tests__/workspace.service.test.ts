import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const wsRepo = vi.hoisted(() => ({
  createWithOwner: vi.fn(),
  findBySlug: vi.fn(),
  existsBySlug: vi.fn(),
  listByUserId: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock("@/src/repositories/workspace.repository", () => ({
  WorkspaceRepository: wsRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/repositories/profile.repository", () => ({
  ProfileRepository: {
    ensureSystemProfiles: vi.fn(async () => ({ ok: true, value: [] })),
  },
}));

import { slugify, WorkspaceService } from "@/src/services/workspace.service";

function workspace(slug: string) {
  return {
    id: `ws_${slug}`,
    name: "Acme",
    slug,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("slugify", () => {
  it("normaliza acentos, símbolos e espaços", () => {
    expect(slugify("Acmé Inç!!")).toBe("acme-inc");
  });
});

describe("WorkspaceService.create", () => {
  beforeEach(() => {
    for (const fn of Object.values(wsRepo)) fn.mockReset();
    for (const fn of Object.values(memberRepo)) fn.mockReset();
  });

  it("deriva o slug do nome quando não informado", async () => {
    wsRepo.existsBySlug.mockResolvedValue(ok(false));
    wsRepo.createWithOwner.mockResolvedValue(ok(workspace("acme-inc")));

    const result = await WorkspaceService.create("user_1", {
      name: "Acme Inc",
    });

    expect(result.ok).toBe(true);
    expect(wsRepo.createWithOwner).toHaveBeenCalledWith(
      { name: "Acme Inc", slug: "acme-inc" },
      "user_1",
    );
  });

  it("sufixa o slug derivado quando há colisão", async () => {
    wsRepo.existsBySlug
      .mockResolvedValueOnce(ok(true)) // "acme" ocupado
      .mockResolvedValueOnce(ok(false)); // "acme-2" livre
    wsRepo.createWithOwner.mockResolvedValue(ok(workspace("acme-2")));

    const result = await WorkspaceService.create("user_1", { name: "Acme" });

    expect(result.ok).toBe(true);
    expect(wsRepo.createWithOwner).toHaveBeenCalledWith(
      { name: "Acme", slug: "acme-2" },
      "user_1",
    );
  });

  it("retorna WORKSPACE_SLUG_TAKEN quando o slug explícito já existe", async () => {
    wsRepo.existsBySlug.mockResolvedValue(ok(true));

    const result = await WorkspaceService.create("user_1", {
      name: "Acme",
      slug: "acme",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_SLUG_TAKEN");
    expect(wsRepo.createWithOwner).not.toHaveBeenCalled();
  });
});

describe("WorkspaceService.getBySlug", () => {
  beforeEach(() => {
    for (const fn of Object.values(memberRepo)) fn.mockReset();
  });

  it("retorna a workspace quando o usuário é membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(
      ok({ id: "m1", workspace: workspace("acme") }),
    );

    const result = await WorkspaceService.getBySlug("user_1", "acme");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.slug).toBe("acme");
  });

  it("retorna WORKSPACE_NOT_FOUND quando não é membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));

    const result = await WorkspaceService.getBySlug("user_1", "secreta");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
  });
});
