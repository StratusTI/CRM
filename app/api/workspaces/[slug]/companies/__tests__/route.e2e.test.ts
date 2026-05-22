import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/companies/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/companies", {
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
  return { user, slug: workspace.slug };
}

describe("/api/workspaces/[slug]/companies (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("retorna 401 quando não autenticado", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const response = await POST(postRequest({ name: "Acme" }), ctx("acme"));
    expect(response.status).toBe(401);
  });

  it("retorna 404 quando o usuário não é membro do workspace", async () => {
    const user = await createUser();
    asUser(user.id);
    const response = await POST(
      postRequest({ name: "Acme" }),
      ctx("workspace-inexistente"),
    );
    expect(response.status).toBe(404);
  });

  it("cria a empresa e retorna 201", async () => {
    const { user, slug } = await memberWorkspace();
    asUser(user.id);

    const response = await POST(
      postRequest({ name: "Acme Inc", domain: "acme.com", arr: 50000 }),
      ctx(slug),
    );
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Acme Inc");
    expect(json.data.createdById).toBe(user.id);
    expect(json.data.arr).toBe(50000);
  });

  it("retorna 422 com payload inválido", async () => {
    const { user, slug } = await memberWorkspace();
    asUser(user.id);
    const response = await POST(postRequest({ name: "" }), ctx(slug));
    expect(response.status).toBe(422);
  });

  it("retorna 409 quando o domínio já existe no workspace", async () => {
    const { user, slug } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ name: "A", domain: "dup.com" }), ctx(slug));

    const response = await POST(
      postRequest({ name: "B", domain: "dup.com" }),
      ctx(slug),
    );
    expect(response.status).toBe(409);
  });

  it("GET lista apenas as empresas do workspace", async () => {
    const { user, slug } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ name: "Acme" }), ctx(slug));

    const response = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/companies"),
      ctx(slug),
    );
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Acme");
  });
});
