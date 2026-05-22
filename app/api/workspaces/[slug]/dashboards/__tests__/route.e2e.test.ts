import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/dashboards/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

async function memberWorkspace() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, workspace };
}

describe("/api/workspaces/[slug]/dashboards (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postRequest({ title: "Vendas" }), ctx("acme"));
    expect(res.status).toBe(401);
  });

  it("cria o dashboard e retorna 201", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);

    const res = await POST(
      postRequest({ title: "Vendas" }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Vendas");
    expect(json.data.createdById).toBe(user.id);
  });

  it("422 quando título está ausente", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(postRequest({}), ctx(workspace.slug));
    expect(res.status).toBe(422);
  });

  it("GET lista os dashboards da workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ title: "Vendas" }), ctx(workspace.slug));
    const res = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/dashboards"),
      ctx(workspace.slug),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});
