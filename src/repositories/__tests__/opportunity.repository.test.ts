import { describe, expect, it } from "vitest";
import { createOpportunity } from "@/src/__tests__/factories/opportunity.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { OpportunityRepository } from "@/src/repositories/opportunity.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("OpportunityRepository (integração)", () => {
  it("create persiste amount, closeDate e stage", async () => {
    const { owner, workspace } = await scope();
    const result = await OpportunityRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Deal",
      amount: 50000,
      closeDate: new Date("2026-06-01T00:00:00.000Z"),
      stage: "PROPOSAL",
      companyId: null,
      pointOfContactId: null,
      ownerId: owner.id,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount?.toString()).toBe("50000");
      expect(result.value.stage).toBe("PROPOSAL");
      expect(result.value.ownerId).toBe(owner.id);
    }
  });

  it("listByWorkspace ignora deletadas e de outra workspace", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createOpportunity(workspace.id, owner.id);
    const removed = await createOpportunity(workspace.id, owner.id);
    await createOpportunity(other.workspace.id, other.owner.id);
    await OpportunityRepository.softDelete(removed.id, owner.id);

    const result = await OpportunityRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("update altera stage e registra updatedById", async () => {
    const { owner, workspace } = await scope();
    const editor = await createUser();
    const opp = await createOpportunity(workspace.id, owner.id);
    const result = await OpportunityRepository.update(opp.id, {
      updatedById: editor.id,
      stage: "WON",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stage).toBe("WON");
      expect(result.value.updatedById).toBe(editor.id);
    }
  });
});
