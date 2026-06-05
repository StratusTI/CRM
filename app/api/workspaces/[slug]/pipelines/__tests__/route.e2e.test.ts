import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  PATCH,
} from "@/app/api/workspaces/[slug]/pipelines/[id]/route";
import { GET, POST } from "@/app/api/workspaces/[slug]/pipelines/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function ctxId(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function jsonRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/pipelines", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/pipelines",
);

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, slug: workspace.slug };
}

describe("/api/workspaces/[slug]/pipelines (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("POST cria um pipeline com etapas e retorna 201", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const res = await POST(
      jsonRequest("POST", {
        name: "Parcerias",
        stages: [
          { name: "Contato", probability: 20, category: "OPEN" },
          { name: "Fechado", probability: 100, category: "WON" },
        ],
      }),
      ctx(slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Parcerias");
    expect(json.data.stages).toHaveLength(2);
    expect(json.data.isDefault).toBe(false);
  });

  it("GET lista o pipeline padrão semeado", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const res = await GET(getRequest, ctx(slug));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(
      json.data.some((p: { isDefault: boolean; name: string }) => p.isDefault),
    ).toBe(true);
  });

  it("PATCH renomeia o pipeline", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const created = await POST(
      jsonRequest("POST", { name: "Antigo", stages: [{ name: "X" }] }),
      ctx(slug),
    );
    const { data } = await created.json();

    const res = await PATCH(
      jsonRequest("PATCH", { name: "Novo" }),
      ctxId(slug, data.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("Novo");
  });

  it("DELETE remove um pipeline não-padrão", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const created = await POST(
      jsonRequest("POST", { name: "Descartável", stages: [{ name: "X" }] }),
      ctx(slug),
    );
    const { data } = await created.json();

    const res = await DELETE(getRequest, ctxId(slug, data.id));
    expect(res.status).toBe(200);
  });

  it("DELETE do pipeline padrão retorna 409", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const list = await GET(getRequest, ctx(slug));
    const { data } = await list.json();
    const def = data.find((p: { isDefault: boolean }) => p.isDefault);

    const res = await DELETE(getRequest, ctxId(slug, def.id));
    expect(res.status).toBe(409);
  });
});
