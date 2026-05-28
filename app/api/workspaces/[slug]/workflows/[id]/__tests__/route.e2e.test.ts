import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { POST as ACTIVATE } from "@/app/api/workspaces/[slug]/workflows/[id]/activate/route";
import {
  GET as GET_DRAFT,
  PUT as PUT_DRAFT,
} from "@/app/api/workspaces/[slug]/workflows/[id]/draft/route";
import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/workspaces/[slug]/workflows/[id]/route";
import { POST as TRIGGER } from "@/app/api/workspaces/[slug]/workflows/[id]/trigger/route";
import { POST as CREATE } from "@/app/api/workspaces/[slug]/workflows/route";

function reqJson(url: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function listCtx(slug: string) {
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

async function createWf(slug: string) {
  const res = await CREATE(
    reqJson("http://localhost/wf", { name: "WF" }),
    listCtx(slug),
  );
  return (await res.json()).data as { id: string; status: string };
}

describe("/api/workspaces/[slug]/workflows/[id] (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await GET(
      new NextRequest("http://localhost/x"),
      ctx("acme", "id"),
    );
    expect(res.status).toBe(401);
  });

  it("GET retorna o workflow", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const res = await GET(
      new NextRequest("http://localhost/x"),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(wf.id);
  });

  it("PATCH atualiza name", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const res = await PATCH(
      reqJson("http://localhost/x", { name: "Outro" }, "PATCH"),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.name).toBe("Outro");
  });

  it("DELETE soft-deleta e some do GET", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const del = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      ctx(workspace.slug, wf.id),
    );
    expect(del.status).toBe(200);
    const after = await GET(
      new NextRequest("http://localhost/x"),
      ctx(workspace.slug, wf.id),
    );
    expect(after.status).toBe(404);
  });

  it("PUT /draft salva definition válida", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const definition = {
      trigger: {
        id: "trigger" as const,
        position: { x: 0, y: 0 },
        data: { type: "launch-manually", inputs: [] },
      },
      nodes: [
        {
          id: "n1",
          position: { x: 100, y: 200 },
          data: { type: "delay", amount: 5, unit: "minutes" },
        },
      ],
      edges: [{ id: "e1", source: "trigger", target: "n1" }],
    };
    const res = await PUT_DRAFT(
      reqJson("http://localhost/x", { definition }, "PUT"),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(200);

    const draft = await GET_DRAFT(
      new NextRequest("http://localhost/x"),
      ctx(workspace.slug, wf.id),
    );
    const dj = await draft.json();
    expect(dj.data.definition.nodes).toHaveLength(1);
    expect(dj.data.definition.edges).toHaveLength(1);
  });

  it("PUT /draft rejeita edge apontando pra node inexistente", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const definition = {
      trigger: {
        id: "trigger" as const,
        position: { x: 0, y: 0 },
        data: null,
      },
      nodes: [],
      edges: [{ id: "e1", source: "trigger", target: "fantasma" }],
    };
    const res = await PUT_DRAFT(
      reqJson("http://localhost/x", { definition }, "PUT"),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(422);
  });

  it("POST /activate falha quando o trigger está vazio", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const res = await ACTIVATE(
      new NextRequest("http://localhost/x", { method: "POST" }),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(422);
  });

  it("POST /activate funciona após salvar trigger e ativa workflow", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const definition = {
      trigger: {
        id: "trigger" as const,
        position: { x: 0, y: 0 },
        data: { type: "launch-manually", inputs: [] },
      },
      nodes: [],
      edges: [],
    };
    await PUT_DRAFT(
      reqJson("http://localhost/x", { definition }, "PUT"),
      ctx(workspace.slug, wf.id),
    );
    const res = await ACTIVATE(
      new NextRequest("http://localhost/x", { method: "POST" }),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("ACTIVE");
    expect(json.data.activeVersionId).toBeTruthy();
  });

  it("POST /trigger inicia run em testMode e retorna 201", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const wf = await createWf(workspace.slug);
    const definition = {
      trigger: {
        id: "trigger" as const,
        position: { x: 0, y: 0 },
        data: { type: "launch-manually", inputs: [] },
      },
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: {
            type: "create-record",
            entity: "task",
            fields: { title: "Sample" },
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger", target: "n1" }],
    };
    await PUT_DRAFT(
      reqJson("http://localhost/x", { definition }, "PUT"),
      ctx(workspace.slug, wf.id),
    );
    const res = await TRIGGER(
      reqJson("http://localhost/x", { payload: {}, test: true }),
      ctx(workspace.slug, wf.id),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.status).toMatch(/COMPLETED|FAILED|WAITING/);
    expect(json.data.steps?.length ?? 0).toBeGreaterThan(0);
  });
});
