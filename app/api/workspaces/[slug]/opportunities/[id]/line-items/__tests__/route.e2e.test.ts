import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpportunity } from "@/src/__tests__/factories/opportunity.factory";
import { createProduct } from "@/src/__tests__/factories/product.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { DELETE } from "@/app/api/workspaces/[slug]/opportunities/[id]/line-items/[itemId]/route";
import {
  GET,
  POST,
} from "@/app/api/workspaces/[slug]/opportunities/[id]/line-items/route";

function ctx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}

function itemCtx(slug: string, id: string, itemId: string) {
  return { params: Promise.resolve({ slug, id, itemId }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getRequest = new NextRequest("http://localhost/api/x");

async function setup() {
  const { prisma } = await import("@/src/lib/prisma");
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const opp = await createOpportunity(workspace.id, user.id);
  const product = await createProduct(workspace.id, user.id, {
    name: "Plano Pro",
    unitPrice: 100,
  });
  return { user, slug: workspace.slug, opp, product, prisma };
}

describe("/api/workspaces/[slug]/opportunities/[id]/line-items (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("POST cria item a partir de produto e recalcula o amount", async () => {
    const { user, slug, opp, product, prisma } = await setup();
    asUser(user.id);

    const res = await POST(
      postRequest({ productId: product.id, quantity: 2 }),
      ctx(slug, opp.id),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Plano Pro");
    expect(json.data.total).toBe(200);

    const reloaded = await prisma.opportunity.findUnique({
      where: { id: opp.id },
    });
    expect(reloaded?.amount?.toString()).toBe("200");
  });

  it("aplica desconto percentual no total", async () => {
    const { user, slug, opp, product } = await setup();
    asUser(user.id);

    const res = await POST(
      postRequest({ productId: product.id, quantity: 1, discountPct: 10 }),
      ctx(slug, opp.id),
    );
    const json = await res.json();
    expect(json.data.total).toBe(90);
  });

  it("ao remover o último item, amount volta a null", async () => {
    const { user, slug, opp, product, prisma } = await setup();
    asUser(user.id);

    const created = await POST(
      postRequest({ productId: product.id, quantity: 1 }),
      ctx(slug, opp.id),
    );
    const { data } = await created.json();

    const del = await DELETE(getRequest, itemCtx(slug, opp.id, data.id));
    expect(del.status).toBe(200);

    const reloaded = await prisma.opportunity.findUnique({
      where: { id: opp.id },
    });
    expect(reloaded?.amount).toBeNull();
  });

  it("excluir o produto mantém o item (snapshot preservado, productId null)", async () => {
    const { user, slug, opp, product, prisma } = await setup();
    asUser(user.id);

    await POST(
      postRequest({ productId: product.id, quantity: 1 }),
      ctx(slug, opp.id),
    );
    // Soft-delete não basta: a FK usa SetNull em hard delete. Aqui validamos o
    // snapshot via hard delete do produto.
    await prisma.product.delete({ where: { id: product.id } });

    const res = await GET(getRequest, ctx(slug, opp.id));
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Plano Pro");
    expect(json.data[0].productId).toBeNull();
  });
});
