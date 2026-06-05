import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { EmailTemplateRepository } from "@/src/repositories/email-template.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

function data(workspaceId: string, createdById: string) {
  return {
    workspaceId,
    createdById,
    name: "Boas-vindas",
    subject: "Olá",
    contentHtml: "<p>oi</p>",
    contentJson: null,
  };
}

describe("EmailTemplateRepository (integração)", () => {
  it("create persiste e escopa", async () => {
    const { owner, workspace } = await scope();
    const result = await EmailTemplateRepository.create(
      data(workspace.id, owner.id),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Boas-vindas");
      expect(result.value.workspaceId).toBe(workspace.id);
    }
  });

  it("findById retorna o template e null para inexistente", async () => {
    const { owner, workspace } = await scope();
    const created = await EmailTemplateRepository.create(
      data(workspace.id, owner.id),
    );
    if (!created.ok) throw new Error("setup");
    const found = await EmailTemplateRepository.findById(created.value.id);
    expect(found.ok && found.value?.id).toBe(created.value.id);
    const missing = await EmailTemplateRepository.findById("nope");
    expect(missing.ok && missing.value).toBeNull();
  });

  it("listByWorkspace ignora soft-deleted e outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await EmailTemplateRepository.create(
      data(workspace.id, owner.id),
    );
    const removed = await EmailTemplateRepository.create(
      data(workspace.id, owner.id),
    );
    await EmailTemplateRepository.create(
      data(other.workspace.id, other.owner.id),
    );
    if (!keep.ok || !removed.ok) throw new Error("setup");
    await EmailTemplateRepository.softDelete(removed.value.id, owner.id);

    const list = await EmailTemplateRepository.listByWorkspace(workspace.id);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value).toHaveLength(1);
      expect(list.value[0].id).toBe(keep.value.id);
    }
  });

  it("update altera campos e carimba updatedById", async () => {
    const { owner, workspace } = await scope();
    const editor = await createUser();
    const created = await EmailTemplateRepository.create(
      data(workspace.id, owner.id),
    );
    if (!created.ok) throw new Error("setup");
    const updated = await EmailTemplateRepository.update(created.value.id, {
      updatedById: editor.id,
      subject: "Novo assunto",
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.subject).toBe("Novo assunto");
      expect(updated.value.updatedById).toBe(editor.id);
    }
  });

  it("create devolve databaseError com workspace inexistente", async () => {
    const { owner } = await scope();
    const result = await EmailTemplateRepository.create(
      data("ws-inexistente", owner.id),
    );
    expect(result.ok).toBe(false);
  });
});
