import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/f/[token]/route";
import {
  createForm,
  LEAD_FIELDS,
} from "@/src/__tests__/factories/form.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";

function submitRequest(token: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/f/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}
async function ownerWorkspace() {
  const user = await createUser();
  const workspace = await createWorkspaceWithOwner(user.id);
  return { user, workspace };
}

describe("/api/f/[token] (e2e)", () => {
  it("GET 404 para formulário não publicado", async () => {
    const { user, workspace } = await ownerWorkspace();
    const form = await createForm(workspace.id, user.id, {
      fields: LEAD_FIELDS,
    });
    const res = await GET(
      new NextRequest(`http://localhost/api/f/${form.publicToken}`),
      ctx(form.publicToken),
    );
    expect(res.status).toBe(404);
  });

  it("GET retorna o formulário público sem o mapping", async () => {
    const { user, workspace } = await ownerWorkspace();
    const form = await createForm(workspace.id, user.id, {
      status: "PUBLISHED",
      fields: LEAD_FIELDS,
    });
    const res = await GET(
      new NextRequest(`http://localhost/api/f/${form.publicToken}`),
      ctx(form.publicToken),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.fields[0].mapping).toBeUndefined();
  });

  it("submete LEAD: cria um Lead e registra a submissão", async () => {
    const { prisma } = await import("@/src/lib/prisma");
    const { user, workspace } = await ownerWorkspace();
    const form = await createForm(workspace.id, user.id, {
      status: "PUBLISHED",
      fields: LEAD_FIELDS,
    });

    const res = await POST(
      submitRequest(form.publicToken, {
        values: { nome: "Ada Lovelace", email: "ada@example.com" },
      }),
      ctx(form.publicToken),
    );
    expect(res.status).toBe(201);

    // A ação LEAD agora cria um Lead (conversão em Pessoa+Oportunidade é manual).
    const lead = await prisma.lead.findFirst({
      where: { workspaceId: workspace.id, emails: { has: "ada@example.com" } },
    });
    expect(lead).not.toBeNull();
    expect(lead?.name).toBe("Ada Lovelace");
    expect(lead?.createdById).toBe(user.id);

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: form.id },
    });
    expect(submissions).toHaveLength(1);
    // submission LEAD não registra pessoa/oportunidade (conversão é posterior).
    expect(submissions[0].createdPersonId).toBeNull();

    const refreshed = await prisma.form.findUnique({ where: { id: form.id } });
    expect(refreshed?.submissionCount).toBe(1);
  });

  it("honeypot preenchido: sucesso sem criar registros", async () => {
    const { prisma } = await import("@/src/lib/prisma");
    const { user, workspace } = await ownerWorkspace();
    const form = await createForm(workspace.id, user.id, {
      status: "PUBLISHED",
      fields: LEAD_FIELDS,
    });

    const res = await POST(
      submitRequest(form.publicToken, {
        values: { nome: "Bot", email: "bot@example.com" },
        _hp: "gotcha",
      }),
      ctx(form.publicToken),
    );
    expect(res.status).toBe(201);

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: form.id },
    });
    expect(submissions).toHaveLength(0);
  });

  it("422 quando um campo obrigatório está ausente", async () => {
    const { user, workspace } = await ownerWorkspace();
    const form = await createForm(workspace.id, user.id, {
      status: "PUBLISHED",
      fields: LEAD_FIELDS,
    });
    const res = await POST(
      submitRequest(form.publicToken, { values: { email: "x@example.com" } }),
      ctx(form.publicToken),
    );
    expect(res.status).toBe(422);
  });
});
