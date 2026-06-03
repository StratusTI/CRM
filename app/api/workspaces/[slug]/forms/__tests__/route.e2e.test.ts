import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { PATCH } from "@/app/api/workspaces/[slug]/forms/[id]/route";
import { GET, POST } from "@/app/api/workspaces/[slug]/forms/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/forms/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function idCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}
function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}
async function memberWorkspace() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, workspace };
}

const NAME_FIELD = {
  key: "nome",
  label: "Nome",
  type: "text",
  required: true,
  mapping: { target: "person", attribute: "name" },
};
const EMAIL_FIELD = {
  key: "email",
  label: "E-mail",
  type: "email",
  required: false,
  mapping: { target: "person", attribute: "email" },
};

describe("/api/workspaces/[slug]/forms (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postRequest({ name: "Contato" }), ctx("acme"));
    expect(res.status).toBe(401);
  });

  it("cria o formulário com publicToken e ação default LEAD", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(
      postRequest({ name: "Contato" }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Contato");
    expect(json.data.action).toBe("LEAD");
    expect(json.data.status).toBe("DRAFT");
    expect(typeof json.data.publicToken).toBe("string");
    expect(json.data.publicUrl).toContain("/f/");
  });

  it("422 quando nome está ausente", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(postRequest({}), ctx(workspace.slug));
    expect(res.status).toBe(422);
  });

  it("GET lista os formulários", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ name: "Contato" }), ctx(workspace.slug));
    const res = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/forms"),
      ctx(workspace.slug),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("bloqueia publicação sem campo de nome obrigatório", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const created = await POST(
      postRequest({ name: "Contato", fields: [EMAIL_FIELD] }),
      ctx(workspace.slug),
    );
    const { id } = (await created.json()).data;

    const res = await PATCH(
      patchRequest({ status: "PUBLISHED" }),
      idCtx(workspace.slug, id),
    );
    expect(res.status).toBe(422);
  });

  it("publica quando os campos mínimos estão mapeados", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const created = await POST(
      postRequest({ name: "Contato", fields: [NAME_FIELD, EMAIL_FIELD] }),
      ctx(workspace.slug),
    );
    const { id } = (await created.json()).data;

    const res = await PATCH(
      patchRequest({ status: "PUBLISHED" }),
      idCtx(workspace.slug, id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("PUBLISHED");
    expect(json.data.publishedAt).not.toBeNull();
  });
});
