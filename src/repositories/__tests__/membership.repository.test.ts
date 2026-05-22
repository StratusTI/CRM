import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { MembershipRepository } from "@/src/repositories/membership.repository";

describe("MembershipRepository (integração)", () => {
  it("findByUserAndSlug retorna a membership com a workspace", async () => {
    const user = await createUser();
    await createWorkspaceWithOwner(user.id, { slug: "acme" });

    const result = await MembershipRepository.findByUserAndSlug(
      user.id,
      "acme",
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.workspace.slug).toBe("acme");
    }
  });

  it("findByUserAndSlug retorna null quando o usuário não é membro", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    await createWorkspaceWithOwner(owner.id, { slug: "acme" });

    const result = await MembershipRepository.findByUserAndSlug(
      outsider.id,
      "acme",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it("listByUser retorna as memberships da mais antiga para a recente", async () => {
    const user = await createUser();
    await createWorkspaceWithOwner(user.id, { slug: "primeira" });
    await createWorkspaceWithOwner(user.id, { slug: "segunda" });

    const result = await MembershipRepository.listByUser(user.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((m) => m.workspace.slug)).toEqual([
        "primeira",
        "segunda",
      ]);
    }
  });
});
