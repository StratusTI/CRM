import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { createWorkspaceInvite } from "@/src/__tests__/factories/workspace-invite.factory";
import { WorkspaceInviteRepository } from "@/src/repositories/workspace-invite.repository";

describe("WorkspaceInviteRepository (integração)", () => {
  it("findByWorkspaceId retorna o convite quando existe", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);
    await createWorkspaceInvite(workspace.id, owner.id, {
      token: "tok-abc",
    });

    const result = await WorkspaceInviteRepository.findByWorkspaceId(
      workspace.id,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value?.token).toBe("tok-abc");
  });

  it("findByWorkspaceId retorna null quando não existe", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);

    const result = await WorkspaceInviteRepository.findByWorkspaceId(
      workspace.id,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it("findByToken inclui a workspace e retorna null pra token inexistente", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id, {
      slug: "ws-tok",
    });
    await createWorkspaceInvite(workspace.id, owner.id, { token: "tok-xyz" });

    const found = await WorkspaceInviteRepository.findByToken("tok-xyz");
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value?.workspace.slug).toBe("ws-tok");

    const missing = await WorkspaceInviteRepository.findByToken("inexistente");
    expect(missing.ok).toBe(true);
    if (missing.ok) expect(missing.value).toBeNull();
  });

  it("create cria com defaults e update altera role/isActive/token", async () => {
    const owner = await createUser();
    const workspace = await createWorkspaceWithOwner(owner.id);

    const created = await WorkspaceInviteRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      token: "tok-new",
      role: "MEMBER",
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.value.role).toBe("MEMBER");
      expect(created.value.isActive).toBe(true);
    }

    const updated = await WorkspaceInviteRepository.update(workspace.id, {
      role: "ADMIN",
      isActive: false,
      token: "tok-rotated",
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.role).toBe("ADMIN");
      expect(updated.value.isActive).toBe(false);
      expect(updated.value.token).toBe("tok-rotated");
    }
  });
});
