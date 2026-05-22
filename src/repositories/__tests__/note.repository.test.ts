import { describe, expect, it } from "vitest";
import { createNote } from "@/src/__tests__/factories/note.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { NoteRepository } from "@/src/repositories/note.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("NoteRepository (integração)", () => {
  it("create persiste título, corpo e escopo", async () => {
    const { owner, workspace } = await scope();
    const result = await NoteRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "Reunião",
      body: "ata",
      companyId: null,
      personId: null,
      opportunityId: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Reunião");
      expect(result.value.workspaceId).toBe(workspace.id);
    }
  });

  it("listByWorkspace ignora deletadas e de outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createNote(workspace.id, owner.id);
    const removed = await createNote(workspace.id, owner.id);
    await createNote(other.workspace.id, other.owner.id);
    await NoteRepository.softDelete(removed.id, owner.id);

    const result = await NoteRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("update altera corpo e registra updatedById", async () => {
    const { owner, workspace } = await scope();
    const editor = await createUser();
    const note = await createNote(workspace.id, owner.id);
    const result = await NoteRepository.update(note.id, {
      updatedById: editor.id,
      body: "atualizada",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.body).toBe("atualizada");
      expect(result.value.updatedById).toBe(editor.id);
    }
  });
});
