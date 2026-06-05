import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ok } from "@/src/lib/result";

const { getAuthSession } = vi.hoisted(() => ({ getAuthSession: vi.fn() }));
vi.mock("@/src/lib/auth-session", () => ({ getAuthSession }));

import {
  GET as GET_COMPANY,
  PATCH as PATCH_COMPANY,
} from "@/app/api/workspaces/[slug]/companies/[id]/route";
import { POST as CREATE_COMPANY } from "@/app/api/workspaces/[slug]/companies/route";
import { POST as CREATE_FIELD } from "@/app/api/workspaces/[slug]/custom-fields/route";

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function idCtx(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) };
}
function asUser(id: string) {
  getAuthSession.mockResolvedValue(ok({ user: { id } }));
}
function jsonReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const getReq = new NextRequest("http://localhost/api/x");

async function setup() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, slug: workspace.slug };
}

describe("campos customizados ponta a ponta (e2e)", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
  });

  it("valor custom persiste e volta no DTO da empresa", async () => {
    const { user, slug } = await setup();
    asUser(user.id);

    // 1. cria a definição (SELECT) para COMPANY
    const fieldRes = await CREATE_FIELD(
      jsonReq({
        entity: "COMPANY",
        key: "segmento",
        label: "Segmento",
        type: "SELECT",
        options: ["PME", "Enterprise"],
      }),
      ctx(slug),
    );
    expect(fieldRes.status).toBe(201);
    const field = (await fieldRes.json()).data;

    // 2. cria a empresa já com o valor custom
    const createRes = await CREATE_COMPANY(
      jsonReq({ name: "Acme", customFields: { [field.id]: "Enterprise" } }),
      ctx(slug),
    );
    expect(createRes.status).toBe(201);
    const company = (await createRes.json()).data;
    expect(company.customFields[`cf_${field.id}`]).toBe("Enterprise");

    // 3. lê de volta e confirma o valor
    const getRes = await GET_COMPANY(getReq, idCtx(slug, company.id));
    const fetched = (await getRes.json()).data;
    expect(fetched.customFields[`cf_${field.id}`]).toBe("Enterprise");

    // 4. atualiza para outra opção
    const patchRes = await PATCH_COMPANY(
      patchReq({ customFields: { [field.id]: "PME" } }),
      idCtx(slug, company.id),
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).data.customFields[`cf_${field.id}`]).toBe(
      "PME",
    );
  });

  it("rejeita opção inválida de SELECT com 422", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const fieldRes = await CREATE_FIELD(
      jsonReq({
        entity: "COMPANY",
        key: "porte",
        label: "Porte",
        type: "SELECT",
        options: ["A", "B"],
      }),
      ctx(slug),
    );
    const field = (await fieldRes.json()).data;

    const res = await CREATE_COMPANY(
      jsonReq({ name: "X", customFields: { [field.id]: "Z" } }),
      ctx(slug),
    );
    expect(res.status).toBe(422);
  });

  it("POST de campo com chave duplicada retorna 409", async () => {
    const { user, slug } = await setup();
    asUser(user.id);
    const body = {
      entity: "COMPANY",
      key: "dup",
      label: "Dup",
      type: "TEXT",
    };
    await CREATE_FIELD(jsonReq(body), ctx(slug));
    const res = await CREATE_FIELD(jsonReq(body), ctx(slug));
    expect(res.status).toBe(409);
  });
});
