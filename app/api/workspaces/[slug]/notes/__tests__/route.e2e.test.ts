import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompany } from "@/src/__tests__/factories/company.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/notes/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/notes", {
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

describe("/api/workspaces/[slug]/notes (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postRequest({ body: "x" }), ctx("acme"));
    expect(res.status).toBe(401);
  });

  it("cria a nota ligada a company e retorna 201", async () => {
    const { user, workspace } = await memberWorkspace();
    const company = await createCompany(workspace.id, user.id);
    asUser(user.id);

    const res = await POST(
      postRequest({ title: "Reunião", body: "ata", companyId: company.id }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.companyId).toBe(company.id);
    expect(json.data.createdById).toBe(user.id);
  });

  it("422 quando nota não tem título nem corpo", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(
      postRequest({ companyId: "co_qualquer" }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(422);
  });

  it("404 quando company referenciada não existe", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(
      postRequest({ body: "x", companyId: "co_x" }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(404);
  });

  it("GET lista as notas da workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ body: "ata" }), ctx(workspace.slug));
    const res = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/notes"),
      ctx(workspace.slug),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});
