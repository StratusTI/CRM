import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { POST as CREATE_SCORING } from "@/app/api/workspaces/[slug]/lead-scoring-rules/route";
import { POST as CONVERT } from "@/app/api/workspaces/[slug]/leads/[id]/convert/route";
import { POST as CREATE_LEAD } from "@/app/api/workspaces/[slug]/leads/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function idCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}
function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}
function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const emptyPost = new NextRequest("http://localhost/api/x", { method: "POST" });

describe("/api/workspaces/[slug]/leads (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("cria lead pontuado pelas regras e roteado ao owner (round-robin)", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    asUser(user.id);

    // regra: source = WhatsApp → +20
    await CREATE_SCORING(
      postReq({
        field: "source",
        operator: "equals",
        value: "WhatsApp",
        points: 20,
      }),
      ctx(workspace.slug),
    );

    const res = await CREATE_LEAD(
      postReq({ name: "Maria", source: "WhatsApp", emails: ["m@x.com"] }),
      ctx(workspace.slug),
    );
    expect(res.status).toBe(201);
    const lead = (await res.json()).data;
    expect(lead.score).toBe(20);
    // sem regra de roteamento → round-robin: o único membro (owner)
    expect(lead.ownerId).toBe(user.id);
  });

  it("converte o lead em pessoa + oportunidade e marca CONVERTED", async () => {
    const { prisma } = await import("@/src/lib/prisma");
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    asUser(user.id);

    const created = await CREATE_LEAD(
      postReq({ name: "João", emails: ["joao@x.com"] }),
      ctx(workspace.slug),
    );
    const lead = (await created.json()).data;

    const res = await CONVERT(emptyPost, idCtx(workspace.slug, lead.id));
    expect(res.status).toBe(200);
    const converted = (await res.json()).data;
    expect(converted.status).toBe("CONVERTED");
    expect(converted.convertedPersonId).toBeTruthy();
    expect(converted.convertedOpportunityId).toBeTruthy();

    const person = await prisma.person.findUnique({
      where: { id: converted.convertedPersonId },
    });
    expect(person?.name).toBe("João");

    // idempotência: segunda conversão falha com 409
    const second = await CONVERT(emptyPost, idCtx(workspace.slug, lead.id));
    expect(second.status).toBe(409);
  });
});
