import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMembership } from "@/src/__tests__/factories/membership.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET as AUDIT } from "@/app/api/workspaces/[slug]/audit-logs/route";
import { PATCH as PATCH_COMPANY } from "@/app/api/workspaces/[slug]/companies/[id]/route";
import { GET as COMPANY_TIMELINE } from "@/app/api/workspaces/[slug]/companies/[id]/timeline/route";
import { POST as CREATE_COMPANY } from "@/app/api/workspaces/[slug]/companies/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function idCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}
function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}
function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const getReq = new NextRequest("http://localhost/api/x");
function auditReq(slug: string, qs = ""): NextRequest {
  return new NextRequest(
    `http://localhost/api/workspaces/${slug}/audit-logs${qs}`,
  );
}

describe("Activity timeline & audit (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("CRUD de empresa gera atividades e a timeline retorna em ordem", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    asUser(user.id);

    const created = await CREATE_COMPANY(
      postReq({ name: "Acme" }),
      ctx(workspace.slug),
    );
    const company = (await created.json()).data;

    await PATCH_COMPANY(
      patchReq({ domain: "acme.com" }),
      idCtx(workspace.slug, company.id),
    );

    const res = await COMPANY_TIMELINE(
      getReq,
      idCtx(workspace.slug, company.id),
    );
    expect(res.status).toBe(200);
    const items = (await res.json()).data;
    // duas atividades: created + updated, mais recente primeiro
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].action).toBe("UPDATED");
    expect(items[0].changedFields).toContain("domain");
    expect(items.at(-1).action).toBe("CREATED");
  });

  it("audit-logs lista as atividades da workspace com filtro", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    asUser(user.id);
    await CREATE_COMPANY(postReq({ name: "Beta" }), ctx(workspace.slug));

    const res = await AUDIT(
      auditReq(workspace.slug, "?entity=company"),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(200);
    const items = (await res.json()).data;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((a: { entity: string }) => a.entity === "company")).toBe(
      true,
    );
  });

  it("membro com perfil padrão (VIEW readonly) consegue ver o audit-log", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const member = await createUser();
    await createMembership(workspace.id, member.id, "MEMBER");

    asUser(member.id);
    const res = await AUDIT(auditReq(workspace.slug), ctx(workspace.slug));
    expect(res.status).toBe(200);
  });
});
