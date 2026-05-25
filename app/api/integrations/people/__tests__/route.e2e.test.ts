import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/integrations/people/route";
import { createCompany } from "@/src/__tests__/factories/company.factory";
import { createIntegrationApiKey } from "@/src/__tests__/factories/integration-api-key.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";

function postRequest(body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/integrations/people", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function workspaceWithKey() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  const { key, token } = await createIntegrationApiKey(workspace.id, user.id);
  return { user, workspace, key, token };
}

describe("/api/integrations/people (e2e)", () => {
  it("401 sem chave de API", async () => {
    const res = await POST(postRequest({ people: [{ name: "Ada" }] }));
    expect(res.status).toBe(401);
  });

  it("401 com chave inválida", async () => {
    const res = await POST(
      postRequest({ people: [{ name: "Ada" }] }, "nexo_invalida"),
    );
    expect(res.status).toBe(401);
  });

  it("401 com chave revogada", async () => {
    const user = await createUser();
    const workspace = await createWorkspaceWithOwner(user.id);
    const { token } = await createIntegrationApiKey(workspace.id, user.id, {
      revokedAt: new Date(),
    });
    const res = await POST(postRequest({ people: [{ name: "Ada" }] }, token));
    expect(res.status).toBe(401);
  });

  it("422 com payload inválido (lista vazia)", async () => {
    const { token } = await workspaceWithKey();
    const res = await POST(postRequest({ people: [] }, token));
    expect(res.status).toBe(422);
  });

  it("422 quando um item tem nome vazio", async () => {
    const { token } = await workspaceWithKey();
    const res = await POST(postRequest({ people: [{ name: "" }] }, token));
    expect(res.status).toBe(422);
  });

  it("cria as pessoas do lote na workspace da chave e reporta sucesso", async () => {
    const { user, workspace, token } = await workspaceWithKey();
    const res = await POST(
      postRequest(
        {
          people: [
            { name: "Ada", emails: ["ada@example.com"] },
            { name: "Grace", phones: ["+5511999999999"] },
          ],
        },
        token,
      ),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.total).toBe(2);
    expect(json.data.created).toBe(2);
    expect(json.data.failed).toBe(0);

    const { prisma } = await import("@/src/lib/prisma");
    const people = await prisma.person.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(people).toHaveLength(2);
    expect(people.every((p) => p.createdById === user.id)).toBe(true);
  });

  it("liga a pessoa à company quando companyId é válido", async () => {
    const { user, workspace, token } = await workspaceWithKey();
    const company = await createCompany(workspace.id, user.id);
    const res = await POST(
      postRequest({ people: [{ name: "Ada", companyId: company.id }] }, token),
    );
    const json = await res.json();
    expect(json.data.results[0].status).toBe("created");

    const { prisma } = await import("@/src/lib/prisma");
    const person = await prisma.person.findFirst({
      where: { workspaceId: workspace.id },
    });
    expect(person?.companyId).toBe(company.id);
  });

  it("reporta falha por item quando a company não existe, sem abortar o lote", async () => {
    const { token } = await workspaceWithKey();
    const res = await POST(
      postRequest(
        {
          people: [
            { name: "Ada", companyId: "co_inexistente" },
            { name: "Grace" },
          ],
        },
        token,
      ),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.created).toBe(1);
    expect(json.data.failed).toBe(1);
    expect(json.data.results[0]).toMatchObject({
      index: 0,
      status: "failed",
      error: { code: "COMPANY_NOT_FOUND" },
    });
    expect(json.data.results[1]).toMatchObject({ index: 1, status: "created" });
  });

  it("atualiza lastUsedAt da chave após uso", async () => {
    const { key, token } = await workspaceWithKey();
    await POST(postRequest({ people: [{ name: "Ada" }] }, token));
    const { prisma } = await import("@/src/lib/prisma");
    const refreshed = await prisma.integrationApiKey.findUnique({
      where: { id: key.id },
    });
    expect(refreshed?.lastUsedAt).not.toBeNull();
  });
});
