import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET } from "@/app/api/workspaces/[slug]/members/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

const getRequest = new NextRequest("http://localhost/api/workspaces/x/members");

describe("/api/workspaces/[slug]/members (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("retorna 401 quando não autenticado", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await GET(getRequest, ctx("x"));
    expect(res.status).toBe(401);
  });

  it("retorna 404 quando não é membro", async () => {
    const outsider = await createUser();
    getAuthSession.mockResolvedValue(ok({ user: { id: outsider.id } }));
    const res = await GET(getRequest, ctx("inexistente"));
    expect(res.status).toBe(404);
  });

  it("lista os membros da workspace com nome e email", async () => {
    const owner = await createUser({ name: "Owner Person" });
    const workspace = await createWorkspaceWithOwner(owner.id);
    getAuthSession.mockResolvedValue(ok({ user: { id: owner.id } }));

    const res = await GET(getRequest, ctx(workspace.slug));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toMatchObject({
      id: owner.id,
      name: "Owner Person",
    });
  });
});
