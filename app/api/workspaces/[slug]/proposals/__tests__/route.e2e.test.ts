import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/proposals/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/proposals", {
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

describe("/api/workspaces/[slug]/proposals (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postRequest({ title: "Proposta" }), ctx("acme"));
    expect(res.status).toBe(401);
  });

  it("cria a proposta com shareToken e retorna 201", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);

    const res = await POST(
      postRequest({ title: "Proposta" }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Proposta");
    expect(json.data.createdById).toBe(user.id);
    expect(json.data.status).toBe("DRAFT");
    expect(typeof json.data.shareToken).toBe("string");
    expect(json.data.shareToken.length).toBeGreaterThan(0);
  });

  it("cria com título padrão quando ausente (documento em branco)", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(postRequest({}), ctx(workspace.slug));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Documento sem título");
  });

  it("GET lista as propostas com viewsCount", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ title: "Proposta" }), ctx(workspace.slug));
    const res = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/proposals"),
      ctx(workspace.slug),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].viewsCount).toBe(0);
  });
});
