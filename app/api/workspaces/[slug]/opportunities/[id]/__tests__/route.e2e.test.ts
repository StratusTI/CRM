import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpportunity } from "@/src/__tests__/factories/opportunity.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/workspaces/[slug]/opportunities/[id]/route";

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/workspaces/acme/opportunities/x",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/opportunities/x",
);

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const opp = await createOpportunity(workspace.id, user.id);
  return { user, slug: workspace.slug, opp };
}

describe("/api/workspaces/[slug]/opportunities/[id] (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna a oportunidade", async () => {
    const { user, slug, opp } = await setup();
    asUser(user.id);
    const res = await GET(getRequest, ctx(slug, opp.id));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(opp.id);
  });

  it("PATCH avança o stage e registra updatedById", async () => {
    const { user, slug, opp } = await setup();
    asUser(user.id);
    const res = await PATCH(
      patchRequest({ stage: "WON", amount: 999 }),
      ctx(slug, opp.id),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.stage).toBe("WON");
    expect(json.data.amount).toBe(999);
    expect(json.data.updatedById).toBe(user.id);
  });

  it("DELETE faz soft delete", async () => {
    const { user, slug, opp } = await setup();
    asUser(user.id);
    await DELETE(getRequest, ctx(slug, opp.id));
    const after = await GET(getRequest, ctx(slug, opp.id));
    expect(after.status).toBe(404);
  });
});
