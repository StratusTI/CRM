import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { MembershipRepository } from "@/src/repositories/membership.repository";
import { WorkspaceRepository } from "@/src/repositories/workspace.repository";

describe("WorkspaceRepository (integração)", () => {
  it("createWithOwner cria a workspace e a membership OWNER", async () => {
    const user = await createUser();

    const result = await WorkspaceRepository.createWithOwner(
      { name: "Acme", slug: "acme" },
      user.id,
    );
    expect(result.ok).toBe(true);

    const membership = await MembershipRepository.findByUserAndSlug(
      user.id,
      "acme",
    );
    expect(membership.ok).toBe(true);
    if (membership.ok && membership.value) {
      expect(membership.value.role).toBe("OWNER");
    }
  });

  it("findBySlug e existsBySlug refletem o estado do banco", async () => {
    const user = await createUser();
    await WorkspaceRepository.createWithOwner(
      { name: "Acme", slug: "acme" },
      user.id,
    );

    const found = await WorkspaceRepository.findBySlug("acme");
    expect(found.ok && found.value?.slug).toBe("acme");

    const exists = await WorkspaceRepository.existsBySlug("acme");
    expect(exists.ok && exists.value).toBe(true);

    const missing = await WorkspaceRepository.existsBySlug("nao-existe");
    expect(missing.ok && missing.value).toBe(false);
  });

  it("listByUserId retorna apenas as workspaces do usuário", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await WorkspaceRepository.createWithOwner(
      { name: "Alice WS", slug: "alice-ws" },
      alice.id,
    );
    await WorkspaceRepository.createWithOwner(
      { name: "Bob WS", slug: "bob-ws" },
      bob.id,
    );

    const result = await WorkspaceRepository.listByUserId(alice.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].slug).toBe("alice-ws");
    }
  });
});
