import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompany } from "@/src/__tests__/factories/company.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { POST } from "@/app/api/workspaces/[slug]/companies/reorder/route";
import { GET } from "@/app/api/workspaces/[slug]/companies/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function reorderRequest(ids: string[]): NextRequest {
  return new NextRequest(
    "http://localhost/api/workspaces/x/companies/reorder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    },
  );
}

describe("/api/workspaces/[slug]/companies/reorder (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("persiste a nova ordem das empresas", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    getAuthSession.mockResolvedValue(ok({ user: { id: user.id } }));

    const a = await createCompany(workspace.id, user.id, { name: "Alpha" });
    const b = await createCompany(workspace.id, user.id, { name: "Bravo" });

    // Reordena para [a, b] (Alpha primeiro).
    const res = await POST(reorderRequest([a.id, b.id]), ctx(workspace.slug));
    expect(res.status).toBe(200);

    const list = await GET(
      new NextRequest("http://localhost/api/workspaces/x/companies"),
      ctx(workspace.slug),
    );
    const json = await list.json();
    expect(json.data.map((c: { id: string }) => c.id)).toEqual([a.id, b.id]);

    // Inverte a ordem e confirma que persistiu.
    await POST(reorderRequest([b.id, a.id]), ctx(workspace.slug));
    const list2 = await GET(
      new NextRequest("http://localhost/api/workspaces/x/companies"),
      ctx(workspace.slug),
    );
    const json2 = await list2.json();
    expect(json2.data.map((c: { id: string }) => c.id)).toEqual([b.id, a.id]);
  });
});
