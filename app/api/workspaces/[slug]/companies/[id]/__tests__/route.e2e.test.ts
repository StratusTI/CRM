import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompany } from "@/src/__tests__/factories/company.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/workspaces/[slug]/companies/[id]/route";

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/companies/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const company = await createCompany(workspace.id, user.id);
  return { user, slug: workspace.slug, company };
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/companies/x",
);

describe("/api/workspaces/[slug]/companies/[id] (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna a empresa do workspace", async () => {
    const { user, slug, company } = await setup();
    asUser(user.id);

    const response = await GET(getRequest, ctx(slug, company.id));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.id).toBe(company.id);
  });

  it("GET retorna 404 para empresa de outro workspace", async () => {
    const { company } = await setup();
    const outsider = await createUser();
    const otherWs = await createWorkspaceWithOwner(outsider.id);
    asUser(outsider.id);

    const response = await GET(getRequest, ctx(otherWs.slug, company.id));
    expect(response.status).toBe(404);
  });

  it("PATCH atualiza e registra updatedById", async () => {
    const { user, slug, company } = await setup();
    asUser(user.id);

    const response = await PATCH(
      patchRequest({ name: "Renomeada", employees: 10 }),
      ctx(slug, company.id),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.name).toBe("Renomeada");
    expect(json.data.employees).toBe(10);
    expect(json.data.updatedById).toBe(user.id);
  });

  it("PATCH retorna 422 com payload vazio", async () => {
    const { user, slug, company } = await setup();
    asUser(user.id);

    const response = await PATCH(patchRequest({}), ctx(slug, company.id));
    expect(response.status).toBe(422);
  });

  it("DELETE faz soft delete e some da listagem", async () => {
    const { user, slug, company } = await setup();
    asUser(user.id);

    const del = await DELETE(getRequest, ctx(slug, company.id));
    expect(del.status).toBe(200);

    const after = await GET(getRequest, ctx(slug, company.id));
    expect(after.status).toBe(404);
  });
});
