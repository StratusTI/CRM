import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompany } from "@/src/__tests__/factories/company.factory";
import { createMembership } from "@/src/__tests__/factories/membership.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { DELETE as DELETE_COMPANY } from "@/app/api/workspaces/[slug]/companies/[id]/route";
import { PATCH as PATCH_MEMBER } from "@/app/api/workspaces/[slug]/members/[userId]/route";
import { GET as GET_PROFILES } from "@/app/api/workspaces/[slug]/profiles/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function idCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}
function memberCtx(slug: string, userId: string) {
  return { params: Promise.resolve({ slug, userId }) };
}
function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}
const getReq = new NextRequest("http://localhost/api/x");
function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("RBAC enforcement (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET /profiles semeia e retorna os 3 perfis de sistema", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    asUser(owner.id);

    const res = await GET_PROFILES(getReq, ctx(workspace.slug));
    expect(res.status).toBe(200);
    const json = await res.json();
    const systemKeys = json.data
      .filter((p: { isSystem: boolean }) => p.isSystem)
      .map((p: { systemKey: string }) => p.systemKey)
      .sort();
    expect(systemKeys).toEqual(["ADMIN", "MEMBER", "OWNER"]);
  });

  it("MEMBER recebe 403 ao excluir empresa; OWNER consegue", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const member = await createUser();
    await createMembership(workspace.id, member.id, "MEMBER");
    const company = await createCompany(workspace.id, owner.id);

    // Membro: sem permissão de DELETE em companies.
    asUser(member.id);
    const denied = await DELETE_COMPANY(
      getReq,
      idCtx(workspace.slug, company.id),
    );
    expect(denied.status).toBe(403);

    // Owner: acesso total.
    asUser(owner.id);
    const allowed = await DELETE_COMPANY(
      getReq,
      idCtx(workspace.slug, company.id),
    );
    expect(allowed.status).toBe(200);
  });

  it("não permite rebaixar o último proprietário", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    asUser(owner.id);

    // pega o perfil "Membro" (system MEMBER)
    const profilesRes = await GET_PROFILES(getReq, ctx(workspace.slug));
    const profiles = (await profilesRes.json()).data;
    const memberProfile = profiles.find(
      (p: { systemKey: string }) => p.systemKey === "MEMBER",
    );

    const res = await PATCH_MEMBER(
      patchReq({ profileId: memberProfile.id }),
      memberCtx(workspace.slug, owner.id),
    );
    expect(res.status).toBe(409);
  });

  it("atribui perfil a um membro com sucesso", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const member = await createUser();
    await createMembership(workspace.id, member.id, "MEMBER");
    asUser(owner.id);

    const profilesRes = await GET_PROFILES(getReq, ctx(workspace.slug));
    const admin = (await profilesRes.json()).data.find(
      (p: { systemKey: string }) => p.systemKey === "ADMIN",
    );

    const res = await PATCH_MEMBER(
      patchReq({ profileId: admin.id }),
      memberCtx(workspace.slug, member.id),
    );
    expect(res.status).toBe(200);
  });
});
