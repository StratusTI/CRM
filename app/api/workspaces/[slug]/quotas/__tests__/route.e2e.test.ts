import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/quotas/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x/quotas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getRequest = new NextRequest("http://localhost/api/x/quotas");

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, slug: workspace.slug };
}

describe("/api/workspaces/[slug]/quotas (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("POST define a meta e é idempotente (upsert) por chave", async () => {
    const { user, slug } = await setup();
    asUser(user.id);

    const first = await POST(
      postRequest({
        ownerId: user.id,
        period: "MONTH",
        periodKey: "2026-06",
        targetAmount: 1000,
      }),
      ctx(slug),
    );
    expect(first.status).toBe(201);

    const second = await POST(
      postRequest({
        ownerId: user.id,
        period: "MONTH",
        periodKey: "2026-06",
        targetAmount: 4000,
      }),
      ctx(slug),
    );
    expect(second.status).toBe(201);
    const json = await second.json();
    expect(json.data.targetAmount).toBe(4000);

    const list = await GET(getRequest, ctx(slug));
    const listJson = await list.json();
    expect(listJson.data).toHaveLength(1);
  });

  it("422 quando period e periodKey não correspondem", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const res = await POST(
      postRequest({
        ownerId: user.id,
        period: "QUARTER",
        periodKey: "2026-06",
        targetAmount: 1000,
      }),
      ctx(slug),
    );
    expect(res.status).toBe(422);
  });

  it("404 quando o responsável não é membro da workspace", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const res = await POST(
      postRequest({
        ownerId: "user_inexistente",
        period: "MONTH",
        periodKey: "2026-06",
        targetAmount: 1000,
      }),
      ctx(slug),
    );
    expect(res.status).toBe(404);
  });
});
