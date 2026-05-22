import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { unauthorized } from "@/src/errors/app-error";
import { err, ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import { POST as acceptConsent } from "@/app/api/users/me/consent/route";
import { GET, PATCH } from "@/app/api/users/me/route";

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function consentRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/users/me/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}

describe("/api/users/me (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("GET retorna 401 quando não autenticado", async () => {
    getAuthSession.mockResolvedValue(err(unauthorized()));
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("GET retorna o DTO do usuário autenticado", async () => {
    const user = await createUser({ name: "Maria" });
    asUser(user.id);

    const response = await GET();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(user.id);
    expect(json.data.name).toBe("Maria");
  });

  it("PATCH atualiza o nome do perfil", async () => {
    const user = await createUser();
    asUser(user.id);

    const response = await PATCH(patchRequest({ name: "Novo Nome" }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.name).toBe("Novo Nome");
  });

  it("PATCH retorna 422 quando não há campos para atualizar", async () => {
    const user = await createUser();
    asUser(user.id);

    const response = await PATCH(patchRequest({}));
    expect(response.status).toBe(422);
  });

  it("consent registra os aceites de termos e privacidade", async () => {
    const user = await createUser();
    asUser(user.id);

    const response = await acceptConsent(
      consentRequest({ acceptTerms: true, acceptPrivacy: true }),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.acceptedTermsAt).not.toBeNull();
    expect(json.data.acceptedPrivacyAt).not.toBeNull();
  });
});
