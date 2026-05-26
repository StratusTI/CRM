import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const inviteRepo = vi.hoisted(() => ({
  findByWorkspaceId: vi.fn(),
  findByToken: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  membership: { create: vi.fn() },
}));

vi.mock("@/src/repositories/workspace-invite.repository", () => ({
  WorkspaceInviteRepository: inviteRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/prisma", () => ({ prisma: prismaMock }));

import { WorkspaceInviteService } from "@/src/services/workspace-invite.service";

const now = new Date("2026-05-26T12:00:00Z");
const ORIGIN = "https://app.test";

function inviteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv1",
    workspaceId: "ws1",
    token: "tok-1",
    role: "MEMBER" as const,
    isActive: true,
    createdById: "u1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function membership(role: "OWNER" | "ADMIN" | "MEMBER", slug = "acme") {
  return {
    id: "m1",
    userId: "u1",
    workspaceId: "ws1",
    role,
    workspace: {
      id: "ws1",
      name: "Acme",
      slug,
      createdAt: now,
      updatedAt: now,
    },
  };
}

beforeEach(() => {
  for (const fn of Object.values(inviteRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
  prismaMock.membership.create.mockReset();
});

describe("WorkspaceInviteService.getOrCreate", () => {
  it("cria convite com defaults quando não existe e é ADMIN/OWNER", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("OWNER")));
    inviteRepo.findByWorkspaceId.mockResolvedValue(ok(null));
    inviteRepo.create.mockResolvedValue(ok(inviteRow({ token: "tok-new" })));

    const result = await WorkspaceInviteService.getOrCreate(
      "u1",
      "acme",
      ORIGIN,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.token).toBe("tok-new");
      expect(result.value.url).toBe(`${ORIGIN}/invite/tok-new`);
      expect(result.value.isActive).toBe(true);
    }
    expect(inviteRepo.create).toHaveBeenCalledOnce();
  });

  it("retorna o existente sem criar", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("ADMIN")));
    inviteRepo.findByWorkspaceId.mockResolvedValue(
      ok(inviteRow({ token: "tok-keep" })),
    );

    const result = await WorkspaceInviteService.getOrCreate(
      "u1",
      "acme",
      ORIGIN,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.token).toBe("tok-keep");
    expect(inviteRepo.create).not.toHaveBeenCalled();
  });

  it("nega para MEMBER (precisa ser OWNER/ADMIN)", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("MEMBER")));

    const result = await WorkspaceInviteService.getOrCreate(
      "u1",
      "acme",
      ORIGIN,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_FORBIDDEN");
    expect(inviteRepo.findByWorkspaceId).not.toHaveBeenCalled();
  });

  it("retorna WORKSPACE_NOT_FOUND quando não é membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));

    const result = await WorkspaceInviteService.getOrCreate(
      "u1",
      "acme",
      ORIGIN,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
  });
});

describe("WorkspaceInviteService.update", () => {
  it("rotaciona token quando regenerate: true", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("ADMIN")));
    inviteRepo.findByWorkspaceId.mockResolvedValue(ok(inviteRow()));
    inviteRepo.update.mockResolvedValue(ok(inviteRow({ token: "tok-rot" })));

    const result = await WorkspaceInviteService.update(
      "u1",
      "acme",
      { regenerate: true },
      ORIGIN,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.token).toBe("tok-rot");
    const [, data] = inviteRepo.update.mock.calls[0];
    expect(typeof data.token).toBe("string");
    expect(data.token).not.toBe("tok-1");
  });

  it("aplica isActive e role sem rotacionar quando regenerate ausente", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("OWNER")));
    inviteRepo.findByWorkspaceId.mockResolvedValue(ok(inviteRow()));
    inviteRepo.update.mockResolvedValue(
      ok(inviteRow({ role: "ADMIN", isActive: false })),
    );

    const result = await WorkspaceInviteService.update(
      "u1",
      "acme",
      { role: "ADMIN", isActive: false },
      ORIGIN,
    );

    expect(result.ok).toBe(true);
    const [, data] = inviteRepo.update.mock.calls[0];
    expect(data.token).toBeUndefined();
    expect(data.role).toBe("ADMIN");
    expect(data.isActive).toBe(false);
  });

  it("nega para MEMBER", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("MEMBER")));

    const result = await WorkspaceInviteService.update(
      "u1",
      "acme",
      { isActive: false },
      ORIGIN,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_FORBIDDEN");
  });
});

describe("WorkspaceInviteService.getPublicByToken", () => {
  it("expõe nome/slug/role do workspace", async () => {
    inviteRepo.findByToken.mockResolvedValue(
      ok({
        ...inviteRow({ role: "ADMIN" }),
        workspace: {
          id: "ws1",
          name: "Acme",
          slug: "acme",
          createdAt: now,
          updatedAt: now,
        },
      }),
    );

    const result = await WorkspaceInviteService.getPublicByToken("tok-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspaceName).toBe("Acme");
      expect(result.value.role).toBe("ADMIN");
    }
  });

  it("bloqueia convite desativado", async () => {
    inviteRepo.findByToken.mockResolvedValue(
      ok({
        ...inviteRow({ isActive: false }),
        workspace: {
          id: "ws1",
          name: "Acme",
          slug: "acme",
          createdAt: now,
          updatedAt: now,
        },
      }),
    );

    const result = await WorkspaceInviteService.getPublicByToken("tok-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_INVITE_DISABLED");
  });

  it("não encontrado retorna WORKSPACE_INVITE_NOT_FOUND", async () => {
    inviteRepo.findByToken.mockResolvedValue(ok(null));

    const result = await WorkspaceInviteService.getPublicByToken("xxx");

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe("WORKSPACE_INVITE_NOT_FOUND");
  });
});

describe("WorkspaceInviteService.accept", () => {
  it("cria membership com role do convite e retorna slug", async () => {
    inviteRepo.findByToken.mockResolvedValue(
      ok({
        ...inviteRow({ role: "ADMIN" }),
        workspace: {
          id: "ws1",
          name: "Acme",
          slug: "acme",
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));
    prismaMock.membership.create.mockResolvedValue({});

    const result = await WorkspaceInviteService.accept("user-new", "tok-1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.slug).toBe("acme");
    expect(prismaMock.membership.create).toHaveBeenCalledWith({
      data: { userId: "user-new", workspaceId: "ws1", role: "ADMIN" },
    });
  });

  it("retorna WORKSPACE_ALREADY_MEMBER quando já é membro", async () => {
    inviteRepo.findByToken.mockResolvedValue(
      ok({
        ...inviteRow(),
        workspace: {
          id: "ws1",
          name: "Acme",
          slug: "acme",
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(membership("MEMBER")));

    const result = await WorkspaceInviteService.accept("u1", "tok-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_ALREADY_MEMBER");
    expect(prismaMock.membership.create).not.toHaveBeenCalled();
  });

  it("bloqueia accept quando convite desativado", async () => {
    inviteRepo.findByToken.mockResolvedValue(
      ok({
        ...inviteRow({ isActive: false }),
        workspace: {
          id: "ws1",
          name: "Acme",
          slug: "acme",
          createdAt: now,
          updatedAt: now,
        },
      }),
    );

    const result = await WorkspaceInviteService.accept("u1", "tok-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_INVITE_DISABLED");
    expect(prismaMock.membership.create).not.toHaveBeenCalled();
  });
});
