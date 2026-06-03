import { describe, expect, it } from "vitest";
import { createProposal } from "@/src/__tests__/factories/proposal.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ProposalRepository } from "@/src/repositories/proposal.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("ProposalRepository (integração)", () => {
  it("create persiste título, token e escopo", async () => {
    const { owner, workspace } = await scope();
    const result = await ProposalRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      title: "Proposta X",
      content: "<p>oi</p>",
      type: "PROPOSAL",
      shareToken: "tok-create-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Proposta X");
      expect(result.value.workspaceId).toBe(workspace.id);
      expect(result.value.type).toBe("PROPOSAL");
      expect(result.value.status).toBe("DRAFT");
      expect(result.value.shareToken).toBe("tok-create-1");
    }
  });

  it("listByWorkspace ignora deletados/outra workspace e traz _count.views", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createProposal(workspace.id, owner.id);
    const removed = await createProposal(workspace.id, owner.id);
    await createProposal(other.workspace.id, other.owner.id);
    await ProposalRepository.softDelete(removed.id, owner.id);

    await ProposalRepository.recordView({
      proposalId: keep.id,
      viewId: "v-1",
      ipHash: "h1",
      durationMs: 1000,
      reachedEnd: true,
      scrolledPct: 100,
      referrer: null,
    });

    const result = await ProposalRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
      expect(result.value[0]._count.views).toBe(1);
    }
  });

  it("findByShareToken resolve só publicadas não-deletadas pela token", async () => {
    const { owner, workspace } = await scope();
    const proposal = await createProposal(workspace.id, owner.id, {
      shareToken: "tok-find-1",
    });
    const found = await ProposalRepository.findByShareToken("tok-find-1");
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value?.id).toBe(proposal.id);

    await ProposalRepository.softDelete(proposal.id, owner.id);
    const afterDelete = await ProposalRepository.findByShareToken("tok-find-1");
    expect(afterDelete.ok).toBe(true);
    if (afterDelete.ok) expect(afterDelete.value).toBeNull();
  });

  it("recordView faz upsert pela mesma sessão (não duplica)", async () => {
    const { owner, workspace } = await scope();
    const proposal = await createProposal(workspace.id, owner.id);

    await ProposalRepository.recordView({
      proposalId: proposal.id,
      viewId: "sess-1",
      ipHash: "h1",
      durationMs: 1000,
      reachedEnd: false,
      scrolledPct: 30,
      referrer: null,
    });
    await ProposalRepository.recordView({
      proposalId: proposal.id,
      viewId: "sess-1",
      ipHash: "h1",
      durationMs: 5000,
      reachedEnd: true,
      scrolledPct: 100,
      referrer: null,
    });

    const metrics = await ProposalRepository.metricsFor(proposal.id);
    expect(metrics.ok).toBe(true);
    if (metrics.ok) {
      expect(metrics.value.totalViews).toBe(1);
      expect(metrics.value.completed).toBe(1);
      expect(metrics.value.avgDurationMs).toBe(5000);
    }
  });

  it("metricsFor conta visitantes únicos por ipHash", async () => {
    const { owner, workspace } = await scope();
    const proposal = await createProposal(workspace.id, owner.id);
    for (const [viewId, ipHash, reachedEnd] of [
      ["a", "ip-1", true],
      ["b", "ip-1", false],
      ["c", "ip-2", false],
    ] as const) {
      await ProposalRepository.recordView({
        proposalId: proposal.id,
        viewId,
        ipHash,
        durationMs: 2000,
        reachedEnd,
        scrolledPct: 50,
        referrer: null,
      });
    }

    const metrics = await ProposalRepository.metricsFor(proposal.id);
    expect(metrics.ok).toBe(true);
    if (metrics.ok) {
      expect(metrics.value.totalViews).toBe(3);
      expect(metrics.value.uniqueVisitors).toBe(2);
      expect(metrics.value.completed).toBe(1);
    }
  });
});
