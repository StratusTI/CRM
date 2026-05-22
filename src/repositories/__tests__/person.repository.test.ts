import { describe, expect, it } from "vitest";
import { createPerson } from "@/src/__tests__/factories/person.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { PersonRepository } from "@/src/repositories/person.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("PersonRepository (integração)", () => {
  it("create persiste arrays e escopo", async () => {
    const { owner, workspace } = await scope();
    const result = await PersonRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Ada",
      emails: ["ada@example.com"],
      phones: ["+55 11 99999-0000"],
      city: "Recife",
      jobTitle: "CTO",
      linkedin: null,
      avatar: null,
      companyId: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.emails).toEqual(["ada@example.com"]);
      expect(result.value.workspaceId).toBe(workspace.id);
    }
  });

  it("listByWorkspace ignora deletadas e de outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createPerson(workspace.id, owner.id);
    const removed = await createPerson(workspace.id, owner.id);
    await createPerson(other.workspace.id, other.owner.id);
    await PersonRepository.softDelete(removed.id, owner.id);

    const result = await PersonRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("existsInWorkspace respeita escopo e soft-delete", async () => {
    const { owner, workspace } = await scope();
    const person = await createPerson(workspace.id, owner.id);

    const exists = await PersonRepository.existsInWorkspace(
      person.id,
      workspace.id,
    );
    expect(exists.ok && exists.value).toBe(true);

    await PersonRepository.softDelete(person.id, owner.id);
    const after = await PersonRepository.existsInWorkspace(
      person.id,
      workspace.id,
    );
    expect(after.ok && after.value).toBe(false);
  });
});
