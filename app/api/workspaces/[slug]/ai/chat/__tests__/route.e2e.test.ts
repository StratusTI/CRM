import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { POST } from "@/app/api/workspaces/[slug]/ai/chat/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces/acme/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id, name: "Ana" } }));
}

describe("/api/workspaces/[slug]/ai/chat (e2e, sem OpenAI)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
    delete process.env.OPENAI_API_KEY;
  });

  it("401 sem sessão", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const res = await POST(postReq({ message: "oi" }), ctx("acme"));
    expect(res.status).toBe(401);
  });

  it("422 com mensagem vazia", async () => {
    asUser("u1");
    const res = await POST(postReq({ message: "   " }), ctx("acme"));
    expect(res.status).toBe(422);
  });

  it("503 quando OPENAI_API_KEY não está configurada", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    asUser(user.id);
    const res = await POST(postReq({ message: "olá" }), ctx(workspace.slug));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("AI_NOT_CONFIGURED");
  });
});
