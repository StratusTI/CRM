import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, PATCH } from "@/app/api/workspaces/[slug]/invite/route";

function inviteRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/invite", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function ctx() {
  return { params: Promise.resolve({ slug: "acme" }) };
}

beforeEach(() => {
  getAuthSession.mockReset();
});

describe("GET /api/workspaces/[slug]/invite", () => {
  it("401 quando não autenticado", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const response = await GET(inviteRequest("GET"), ctx());
    expect(response.status).toBe(401);
  });

  it("OWNER recebe convite criado on-demand com URL absoluta", async () => {
    const owner = await createUser();
    await createWorkspaceWithOwner(owner.id, { slug: "acme" });
    asUser(owner.id);

    const response = await GET(inviteRequest("GET"), ctx());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(typeof json.data.token).toBe("string");
    expect(json.data.url).toBe(
      `http://localhost:3000/invite/${json.data.token}`,
    );
    expect(json.data.role).toBe("MEMBER");
    expect(json.data.isActive).toBe(true);
  });

  it("MEMBER recebe 403", async () => {
    const owner = await createUser();
    const member = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id, {
      slug: "acme",
    });
    const { prisma } = await import("@/src/lib/prisma");
    await prisma.membership.create({
      data: { userId: member.id, workspaceId: workspace.id, role: "MEMBER" },
    });
    asUser(member.id);

    const response = await GET(inviteRequest("GET"), ctx());
    expect(response.status).toBe(403);
  });

  it("não-membro recebe 404 (não vazamos existência)", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    await createWorkspaceWithOwner(owner.id, { slug: "acme" });
    asUser(outsider.id);

    const response = await GET(inviteRequest("GET"), ctx());
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/workspaces/[slug]/invite", () => {
  it("422 quando body é vazio", async () => {
    const owner = await createUser();
    await createWorkspaceWithOwner(owner.id, { slug: "acme" });
    asUser(owner.id);

    // garante que o convite existe
    await GET(inviteRequest("GET"), ctx());

    const response = await PATCH(inviteRequest("PATCH", {}), ctx());
    expect(response.status).toBe(422);
  });

  it("regenerate: true troca o token", async () => {
    const owner = await createUser();
    await createWorkspaceWithOwner(owner.id, { slug: "acme" });
    asUser(owner.id);

    const before = await (await GET(inviteRequest("GET"), ctx())).json();
    const response = await PATCH(
      inviteRequest("PATCH", { regenerate: true }),
      ctx(),
    );
    expect(response.status).toBe(200);
    const after = await response.json();
    expect(after.data.token).not.toBe(before.data.token);
  });

  it("aplica isActive e role", async () => {
    const owner = await createUser();
    await createWorkspaceWithOwner(owner.id, { slug: "acme" });
    asUser(owner.id);
    await GET(inviteRequest("GET"), ctx());

    const response = await PATCH(
      inviteRequest("PATCH", { isActive: false, role: "ADMIN" }),
      ctx(),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.isActive).toBe(false);
    expect(json.data.role).toBe("ADMIN");
  });
});
