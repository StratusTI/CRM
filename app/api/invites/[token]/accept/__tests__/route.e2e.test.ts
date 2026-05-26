import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { createWorkspaceInvite } from "@/src/__tests__/factories/workspace-invite.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { POST } from "@/app/api/invites/[token]/accept/route";

function req(token: string) {
  return new NextRequest(`http://localhost/api/invites/${token}/accept`, {
    method: "POST",
  });
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  getAuthSession.mockReset();
});

describe("POST /api/invites/[token]/accept", () => {
  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const response = await POST(req("x"), ctx("x"));
    expect(response.status).toBe(401);
  });

  it("usuário logado vira membro e recebe o slug", async () => {
    const owner = await createUser();
    const newcomer = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id, {
      slug: "acme",
    });
    const invite = await createWorkspaceInvite(workspace.id, owner.id, {
      role: "ADMIN",
    });
    getAuthSession.mockResolvedValue(ok({ user: { id: newcomer.id } }));

    const response = await POST(req(invite.token), ctx(invite.token));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.slug).toBe("acme");

    const { prisma } = await import("@/src/lib/prisma");
    const membership = await prisma.membership.findFirst({
      where: { userId: newcomer.id, workspaceId: workspace.id },
    });
    expect(membership?.role).toBe("ADMIN");
  });

  it("já-membro retorna 409", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id, {
      slug: "acme",
    });
    const invite = await createWorkspaceInvite(workspace.id, owner.id);
    getAuthSession.mockResolvedValue(ok({ user: { id: owner.id } }));

    const response = await POST(req(invite.token), ctx(invite.token));
    expect(response.status).toBe(409);
  });

  it("desativado retorna 410", async () => {
    const owner = await createUser();
    const newcomer = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const invite = await createWorkspaceInvite(workspace.id, owner.id, {
      isActive: false,
    });
    getAuthSession.mockResolvedValue(ok({ user: { id: newcomer.id } }));

    const response = await POST(req(invite.token), ctx(invite.token));
    expect(response.status).toBe(410);
  });
});
