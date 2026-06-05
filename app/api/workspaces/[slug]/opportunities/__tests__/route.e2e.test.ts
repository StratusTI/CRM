import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPerson } from "@/src/__tests__/factories/person.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/opportunities/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/opportunities", {
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

describe("/api/workspaces/[slug]/opportunities (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postRequest({ name: "Deal" }), ctx("acme"));
    expect(res.status).toBe(401);
  });

  it("cria a oportunidade com pointOfContact e retorna 201", async () => {
    const { user, workspace } = await memberWorkspace();
    const person = await createPerson(workspace.id, user.id);
    asUser(user.id);

    const res = await POST(
      postRequest({
        name: "Deal",
        amount: 1000,
        pointOfContactId: person.id,
        closeDate: "2026-06-01T00:00:00.000Z",
      }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.amount).toBe(1000);
    expect(json.data.pointOfContactId).toBe(person.id);
    expect(json.data.closeDate).toBe("2026-06-01T00:00:00.000Z");
  });

  it("404 quando pointOfContact não existe na workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(
      postRequest({ name: "Deal", pointOfContactId: "p_x" }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(404);
  });

  it("422 com amount inválido", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    const res = await POST(
      postRequest({ name: "Deal", amount: -5 }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(422);
  });

  it("GET lista as oportunidades da workspace", async () => {
    const { user, workspace } = await memberWorkspace();
    asUser(user.id);
    await POST(postRequest({ name: "Deal" }), ctx(workspace.slug));
    const res = await GET(
      new NextRequest("http://localhost/api/workspaces/acme/opportunities"),
      ctx(workspace.slug),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});
