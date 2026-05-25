import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createIntegrationApiKey } from "@/src/__tests__/factories/integration-api-key.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { hashApiKey } from "@/src/lib/integration/api-key";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { DELETE } from "@/app/api/workspaces/[slug]/integration-keys/[id]/route";
import { GET, POST } from "@/app/api/workspaces/[slug]/integration-keys/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/workspaces/acme/integration-keys",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function listCtx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function itemCtx(slug: string, id: string) {
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

describe("/api/workspaces/[slug]/integration-keys (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postRequest({ name: "ERP" }), listCtx("acme"));
    expect(res.status).toBe(401);
  });

  it("gera a chave e retorna o token só uma vez, guardando o hash", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(
      postRequest({ name: "ERP" }),
      listCtx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.token).toMatch(/^nexo_/);
    expect(json.data.prefix).toMatch(/^nexo_/);

    const { prisma } = await import("@/src/lib/prisma");
    const stored = await prisma.integrationApiKey.findUnique({
      where: { id: json.data.id },
    });
    expect(stored?.keyHash).toBe(hashApiKey(json.data.token));
    expect(stored?.createdById).toBe(user.id);
  });

  it("422 com nome vazio", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(postRequest({ name: "" }), listCtx(workspace.slug));
    expect(res.status).toBe(422);
  });

  it("GET lista as chaves da workspace sem expor segredos", async () => {
    const { user, workspace } = await memberWorkspace();
    await createIntegrationApiKey(workspace.id, user.id, { name: "ERP" });
    asUser(user.id);
    const res = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/integration-keys"),
      listCtx(workspace.slug),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).not.toHaveProperty("keyHash");
    expect(json.data[0]).not.toHaveProperty("token");
  });

  it("DELETE revoga a chave da workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    const { key } = await createIntegrationApiKey(workspace.id, user.id);
    asUser(user.id);
    const res = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      itemCtx(workspace.slug, key.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.revokedAt).not.toBeNull();
  });

  it("404 ao revogar chave de outra workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    const other = await memberWorkspace();
    const { key } = await createIntegrationApiKey(
      other.workspace.id,
      other.user.id,
    );
    asUser(user.id);
    const res = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      itemCtx(workspace.slug, key.id),
    );
    expect(res.status).toBe(404);
  });
});
