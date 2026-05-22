import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { GET, POST } from "@/app/api/workspaces/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

describe("/api/workspaces (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("retorna 401 quando não autenticado", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const response = await POST(postRequest({ name: "Acme" }));
    expect(response.status).toBe(401);
  });

  it("cria a workspace e retorna 201 com o slug derivado", async () => {
    const user = await createUser();
    asUser(user.id);

    const response = await POST(postRequest({ name: "Acme Inc" }));
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.slug).toBe("acme-inc");
  });

  it("retorna 422 com payload inválido", async () => {
    const user = await createUser();
    asUser(user.id);

    const response = await POST(postRequest({ name: "" }));
    expect(response.status).toBe(422);
  });

  it("GET lista as workspaces do usuário autenticado", async () => {
    const user = await createUser();
    asUser(user.id);
    await POST(postRequest({ name: "Acme" }));

    const response = await GET();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].slug).toBe("acme");
  });
});
