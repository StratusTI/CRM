import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDashboard } from "@/src/__tests__/factories/dashboard.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  GET,
  POST,
} from "@/app/api/workspaces/[slug]/dashboards/[id]/widgets/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/w", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const dashboard = await createDashboard(workspace.id, user.id);
  return { user, slug: workspace.slug, dashboard };
}

describe("/api/workspaces/[slug]/dashboards/[id]/widgets (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("cria um widget chart e retorna 201", async () => {
    const { user, slug, dashboard } = await setup();
    asUser(user.id);
    const res = await POST(
      postRequest({ type: "CHART", config: { chartType: "vertical" } }),
      ctx(slug, dashboard.id),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.type).toBe("CHART");
    expect(json.data.dashboardId).toBe(dashboard.id);
  });

  it("422 quando a config não bate com o tipo", async () => {
    const { user, slug, dashboard } = await setup();
    asUser(user.id);
    const res = await POST(
      postRequest({ type: "IFRAME", config: { chartType: "pie" } }),
      ctx(slug, dashboard.id),
    );
    expect(res.status).toBe(422);
  });

  it("GET lista os widgets do dashboard", async () => {
    const { user, slug, dashboard } = await setup();
    asUser(user.id);
    await POST(
      postRequest({ type: "RICH_TEXT", config: { html: "<p>oi</p>" } }),
      ctx(slug, dashboard.id),
    );
    const res = await GET(
      new NextRequest("http://localhost/api/w"),
      ctx(slug, dashboard.id),
    );
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});
