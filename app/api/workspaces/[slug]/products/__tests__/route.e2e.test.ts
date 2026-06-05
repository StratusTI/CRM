import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/[slug]/products/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getRequest = new NextRequest(
  "http://localhost/api/workspaces/acme/products",
);

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, slug: workspace.slug };
}

describe("/api/workspaces/[slug]/products (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("POST cria um produto e retorna 201", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const res = await POST(
      postRequest({
        name: "Plano Pro",
        unitPrice: 199.9,
        billingType: "MONTHLY",
      }),
      ctx(slug),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Plano Pro");
    expect(json.data.unitPrice).toBe(199.9);
    expect(json.data.billingType).toBe("MONTHLY");
  });

  it("POST com SKU duplicado retorna 409", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    await POST(postRequest({ name: "A", sku: "DUP" }), ctx(slug));
    const res = await POST(postRequest({ name: "B", sku: "DUP" }), ctx(slug));
    expect(res.status).toBe(409);
  });

  it("GET lista os produtos da workspace", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    await POST(postRequest({ name: "Plano" }), ctx(slug));
    const res = await GET(getRequest, ctx(slug));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});
