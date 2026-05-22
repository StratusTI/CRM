import { describe, expect, it } from "vitest";
import { createTask } from "@/src/__tests__/factories/task.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { TaskRepository } from "@/src/repositories/task.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("TaskRepository (integração)", () => {
  it("create persiste status, dueDate e assignee", async () => {
    const { owner, workspace } = await scope();
    const result = await TaskRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "Ligar",
      status: "IN_PROGRESS",
      body: "detalhes",
      dueDate: new Date("2026-06-01T00:00:00.000Z"),
      assigneeId: owner.id,
      companyId: null,
      personId: null,
      opportunityId: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("IN_PROGRESS");
      expect(result.value.assigneeId).toBe(owner.id);
    }
  });

  it("listByWorkspace ignora deletadas e de outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createTask(workspace.id, owner.id);
    const removed = await createTask(workspace.id, owner.id);
    await createTask(other.workspace.id, other.owner.id);
    await TaskRepository.softDelete(removed.id, owner.id);

    const result = await TaskRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("update altera status e registra updatedById", async () => {
    const { owner, workspace } = await scope();
    const editor = await createUser();
    const task = await createTask(workspace.id, owner.id);
    const result = await TaskRepository.update(task.id, {
      updatedById: editor.id,
      status: "DONE",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("DONE");
      expect(result.value.updatedById).toBe(editor.id);
    }
  });
});
