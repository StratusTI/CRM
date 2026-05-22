import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNote } from "@/src/__tests__/factories/note.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/workspaces/[slug]/notes/[id]/route";

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/notes/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/notes/x",
);

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const note = await createNote(workspace.id, user.id);
  return { user, slug: workspace.slug, note };
}

describe("/api/workspaces/[slug]/notes/[id] (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna a nota", async () => {
    const { user, slug, note } = await setup();
    asUser(user.id);
    const res = await GET(getRequest, ctx(slug, note.id));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(note.id);
  });

  it("PATCH atualiza o corpo e registra updatedById", async () => {
    const { user, slug, note } = await setup();
    asUser(user.id);
    const res = await PATCH(
      patchRequest({ body: "atualizada" }),
      ctx(slug, note.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.body).toBe("atualizada");
    expect(json.data.updatedById).toBe(user.id);
  });

  it("DELETE faz soft delete", async () => {
    const { user, slug, note } = await setup();
    asUser(user.id);
    await DELETE(getRequest, ctx(slug, note.id));
    const after = await GET(getRequest, ctx(slug, note.id));
    expect(after.status).toBe(404);
  });
});
