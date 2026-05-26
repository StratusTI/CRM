import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/invites/[token]/route";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { createWorkspaceInvite } from "@/src/__tests__/factories/workspace-invite.factory";

function req(token: string) {
  return new NextRequest(`http://localhost/api/invites/${token}`);
}

function ctx(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("GET /api/invites/[token]", () => {
  it("expõe nome do workspace sem exigir sessão", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id, {
      name: "Acme",
      slug: "acme",
    });
    const invite = await createWorkspaceInvite(workspace.id, owner.id, {
      role: "ADMIN",
    });

    const response = await GET(req(invite.token), ctx(invite.token));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.workspaceName).toBe("Acme");
    expect(json.data.workspaceSlug).toBe("acme");
    expect(json.data.role).toBe("ADMIN");
    // não vaza token nem isActive
    expect(json.data.token).toBeUndefined();
    expect(json.data.isActive).toBeUndefined();
  });

  it("token inexistente retorna 404", async () => {
    const response = await GET(req("nao-existe"), ctx("nao-existe"));
    expect(response.status).toBe(404);
  });

  it("convite desativado retorna 410", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    const invite = await createWorkspaceInvite(workspace.id, owner.id, {
      isActive: false,
    });

    const response = await GET(req(invite.token), ctx(invite.token));
    expect(response.status).toBe(410);
  });
});
