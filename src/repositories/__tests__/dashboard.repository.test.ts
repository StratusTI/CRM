import { describe, expect, it } from "vitest";
import { createDashboard } from "@/src/__tests__/factories/dashboard.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { DashboardRepository } from "@/src/repositories/dashboard.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("DashboardRepository (integração)", () => {
  it("create persiste título e escopo", async () => {
    const { owner, workspace } = await scope();
    const result = await DashboardRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "Visão geral",
      pageLayoutId: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Visão geral");
      expect(result.value.workspaceId).toBe(workspace.id);
    }
  });

  it("listByWorkspace ignora deletados e de outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createDashboard(workspace.id, owner.id);
    const removed = await createDashboard(workspace.id, owner.id);
    await createDashboard(other.workspace.id, other.owner.id);
    await DashboardRepository.softDelete(removed.id, owner.id);

    const result = await DashboardRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("update altera título e registra updatedById", async () => {
    const { owner, workspace } = await scope();
    const editor = await createUser();
    const dashboard = await createDashboard(workspace.id, owner.id);
    const result = await DashboardRepository.update(dashboard.id, {
      updatedById: editor.id,
      title: "Pipeline",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Pipeline");
      expect(result.value.updatedById).toBe(editor.id);
    }
  });
});
