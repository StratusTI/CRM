import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { MailingListRepository } from "@/src/repositories/mailing-list.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

async function createList(workspaceId: string, createdById: string) {
  const result = await MailingListRepository.create({
    workspaceId,
    createdById,
    name: "Leads",
  });
  if (!result.ok) throw new Error("setup");
  return result.value;
}

describe("MailingListRepository (integração)", () => {
  it("create persiste a lista", async () => {
    const { owner, workspace } = await scope();
    const result = await MailingListRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Newsletter",
      description: "Mensal",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Newsletter");
  });

  it("addMembers normaliza email e ignora duplicados", async () => {
    const { owner, workspace } = await scope();
    const list = await createList(workspace.id, owner.id);
    await MailingListRepository.addMembers(list.id, [
      { email: "  A@B.com ", name: " Ana " },
      { email: "a@b.com" }, // duplicado após normalizar
      { email: "c@d.com" },
    ]);
    const found = await MailingListRepository.findById(list.id);
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value?.members).toHaveLength(2);
      const ana = found.value?.members.find((m) => m.email === "a@b.com");
      expect(ana?.name).toBe("Ana");
    }
  });

  it("listByWorkspace traz _count.members e ignora soft-deleted", async () => {
    const { owner, workspace } = await scope();
    const keep = await createList(workspace.id, owner.id);
    const removed = await createList(workspace.id, owner.id);
    await MailingListRepository.addMembers(keep.id, [{ email: "a@b.com" }]);
    await MailingListRepository.softDelete(removed.id);

    const list = await MailingListRepository.listByWorkspace(workspace.id);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value).toHaveLength(1);
      expect(list.value[0]._count.members).toBe(1);
    }
  });

  it("findById retorna null para lista deletada", async () => {
    const { owner, workspace } = await scope();
    const list = await createList(workspace.id, owner.id);
    await MailingListRepository.softDelete(list.id);
    const found = await MailingListRepository.findById(list.id);
    expect(found.ok && found.value).toBeNull();
  });

  it("update altera nome/descrição", async () => {
    const { owner, workspace } = await scope();
    const list = await createList(workspace.id, owner.id);
    const updated = await MailingListRepository.update(list.id, {
      name: "Renomeada",
    });
    expect(updated.ok && updated.value.name).toBe("Renomeada");
  });

  it("removeMember remove e getMembersByListIds agrega de várias listas", async () => {
    const { owner, workspace } = await scope();
    const a = await createList(workspace.id, owner.id);
    const b = await createList(workspace.id, owner.id);
    await MailingListRepository.addMembers(a.id, [{ email: "a@b.com" }]);
    await MailingListRepository.addMembers(b.id, [{ email: "c@d.com" }]);

    const both = await MailingListRepository.getMembersByListIds([a.id, b.id]);
    expect(both.ok && both.value).toHaveLength(2);

    const foundA = await MailingListRepository.findById(a.id);
    if (!foundA.ok || !foundA.value) throw new Error("setup");
    await MailingListRepository.removeMember(foundA.value.members[0].id);
    const after = await MailingListRepository.findById(a.id);
    expect(after.ok && after.value?.members).toHaveLength(0);
  });
});
