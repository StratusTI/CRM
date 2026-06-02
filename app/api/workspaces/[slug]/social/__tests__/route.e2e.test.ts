import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSocialConnection } from "@/src/__tests__/factories/social-connection.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { DELETE } from "@/app/api/workspaces/[slug]/social/[platform]/route";
import { GET } from "@/app/api/workspaces/[slug]/social/route";

function getRequest(slug: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspaces/${slug}/social`);
}

function deleteRequest(slug: string, platform: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/workspaces/${slug}/social/${platform}`,
    { method: "DELETE" },
  );
}

function listCtx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function platformCtx(slug: string, platform: string) {
  return { params: Promise.resolve({ slug, platform }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

async function memberWorkspace() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, workspace };
}

describe("/api/workspaces/[slug]/social (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna 401 quando não autenticado", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const response = await GET(getRequest("acme"), listCtx("acme"));
    expect(response.status).toBe(401);
  });

  it("GET lista as conexões sem expor tokens", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await createSocialConnection(workspace.id, user.id, {
      platform: "INSTAGRAM",
      accountName: "@acme",
    });

    const response = await GET(
      getRequest(workspace.slug),
      listCtx(workspace.slug),
    );
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].platform).toBe("INSTAGRAM");
    expect(json.data[0].accountName).toBe("@acme");
    expect(json.data[0].accessToken).toBeUndefined();
  });

  it("DELETE desconecta a plataforma", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await createSocialConnection(workspace.id, user.id, {
      platform: "FACEBOOK",
    });

    const response = await DELETE(
      deleteRequest(workspace.slug, "facebook"),
      platformCtx(workspace.slug, "facebook"),
    );
    expect(response.status).toBe(200);

    const list = await GET(getRequest(workspace.slug), listCtx(workspace.slug));
    const json = await list.json();
    expect(json.data).toHaveLength(0);
  });

  it("DELETE retorna 404 quando não havia conexão", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);

    const response = await DELETE(
      deleteRequest(workspace.slug, "tiktok"),
      platformCtx(workspace.slug, "tiktok"),
    );
    expect(response.status).toBe(404);
  });

  it("DELETE retorna 400 para plataforma inválida", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);

    const response = await DELETE(
      deleteRequest(workspace.slug, "myspace"),
      platformCtx(workspace.slug, "myspace"),
    );
    expect(response.status).toBe(400);
  });
});
