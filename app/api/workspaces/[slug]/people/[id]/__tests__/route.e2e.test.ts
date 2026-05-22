import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPerson } from "@/src/__tests__/factories/person.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/workspaces/[slug]/people/[id]/route";

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/people/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/people/x",
);

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const person = await createPerson(workspace.id, user.id);
  return { user, slug: workspace.slug, person };
}

describe("/api/workspaces/[slug]/people/[id] (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna a pessoa", async () => {
    const { user, slug, person } = await setup();
    asUser(user.id);
    const res = await GET(getRequest, ctx(slug, person.id));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(person.id);
  });

  it("PATCH atualiza e registra updatedById", async () => {
    const { user, slug, person } = await setup();
    asUser(user.id);
    const res = await PATCH(
      patchRequest({ jobTitle: "VP", city: null }),
      ctx(slug, person.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.jobTitle).toBe("VP");
    expect(json.data.updatedById).toBe(user.id);
  });

  it("DELETE faz soft delete e some da consulta", async () => {
    const { user, slug, person } = await setup();
    asUser(user.id);
    await DELETE(getRequest, ctx(slug, person.id));
    const after = await GET(getRequest, ctx(slug, person.id));
    expect(after.status).toBe(404);
  });
});
