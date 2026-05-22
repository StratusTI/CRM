import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTask } from "@/src/__tests__/factories/task.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/workspaces/[slug]/tasks/[id]/route";

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/tasks/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/tasks/x",
);

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const task = await createTask(workspace.id, user.id);
  return { user, slug: workspace.slug, task };
}

describe("/api/workspaces/[slug]/tasks/[id] (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna a tarefa", async () => {
    const { user, slug, task } = await setup();
    asUser(user.id);
    const res = await GET(getRequest, ctx(slug, task.id));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(task.id);
  });

  it("PATCH conclui a tarefa e registra updatedById", async () => {
    const { user, slug, task } = await setup();
    asUser(user.id);
    const res = await PATCH(
      patchRequest({ status: "DONE" }),
      ctx(slug, task.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("DONE");
    expect(json.data.updatedById).toBe(user.id);
  });

  it("DELETE faz soft delete", async () => {
    const { user, slug, task } = await setup();
    asUser(user.id);
    await DELETE(getRequest, ctx(slug, task.id));
    const after = await GET(getRequest, ctx(slug, task.id));
    expect(after.status).toBe(404);
  });
});
