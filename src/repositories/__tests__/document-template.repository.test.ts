import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { DocumentTemplateRepository } from "@/src/repositories/document-template.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("DocumentTemplateRepository (integração)", () => {
  it("create persiste com tipo e escopo", async () => {
    const { owner, workspace } = await scope();
    const result = await DocumentTemplateRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "Modelo",
      content: "<p>x</p>",
      type: "PROPOSAL",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("PROPOSAL");
      expect(result.value.workspaceId).toBe(workspace.id);
    }
  });

  it("listByWorkspace filtra por tipo e ignora soft-deleted", async () => {
    const { owner, workspace } = await scope();
    const proposal = await DocumentTemplateRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "P",
      content: "",
      type: "PROPOSAL",
    });
    await DocumentTemplateRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "C",
      content: "",
      type: "CONTRACT",
    });
    const removed = await DocumentTemplateRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "Old",
      content: "",
      type: "PROPOSAL",
    });
    if (!proposal.ok || !removed.ok) throw new Error("setup");
    await DocumentTemplateRepository.softDelete(removed.value.id);

    const all = await DocumentTemplateRepository.listByWorkspace(workspace.id);
    expect(all.ok && all.value).toHaveLength(2);

    const onlyProposals = await DocumentTemplateRepository.listByWorkspace(
      workspace.id,
      "PROPOSAL",
    );
    expect(onlyProposals.ok).toBe(true);
    if (onlyProposals.ok) {
      expect(onlyProposals.value).toHaveLength(1);
      expect(onlyProposals.value[0].id).toBe(proposal.value.id);
    }
  });

  it("findById resolve e retorna null para inexistente", async () => {
    const missing = await DocumentTemplateRepository.findById("nope");
    expect(missing.ok && missing.value).toBeNull();
  });
});
