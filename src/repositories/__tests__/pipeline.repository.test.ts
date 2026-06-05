import { describe, expect, it } from "vitest";
import { createOpportunity } from "@/src/__tests__/factories/opportunity.factory";
import { createPipeline } from "@/src/__tests__/factories/pipeline.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { PipelineRepository } from "@/src/repositories/pipeline.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("PipelineRepository (integração)", () => {
  it("create persiste o pipeline com etapas ordenadas", async () => {
    const { owner, workspace } = await scope();
    const result = await PipelineRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Vendas",
      stages: [
        { name: "A", probability: 10, category: "OPEN", color: null },
        { name: "B", probability: 90, category: "WON", color: "#10b981" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stages).toHaveLength(2);
      const ordered = [...result.value.stages].sort(
        (a, b) => a.position - b.position,
      );
      expect(ordered[0].name).toBe("A");
      expect(ordered[1].category).toBe("WON");
    }
  });

  it("findDefault devolve o pipeline padrão semeado", async () => {
    const { workspace } = await scope();
    const result = await PipelineRepository.findDefault(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.isDefault).toBe(true);
      expect(result.value?.stages.length).toBeGreaterThan(0);
    }
  });

  it("stageBelongsTo valida etapa × pipeline × workspace", async () => {
    const { owner, workspace } = await scope();
    const pipeline = await createPipeline(workspace.id, owner.id);
    const ok = await PipelineRepository.stageBelongsTo(
      pipeline.stages[0].id,
      pipeline.id,
      workspace.id,
    );
    expect(ok.ok && ok.value).toBe(true);

    const wrong = await PipelineRepository.stageBelongsTo(
      pipeline.stages[0].id,
      pipeline.id,
      "ws_inexistente",
    );
    expect(wrong.ok && wrong.value).toBe(false);
  });

  it("stagesInUse e countOpportunities refletem oportunidades vinculadas", async () => {
    const { owner, workspace } = await scope();
    const pipeline = await createPipeline(workspace.id, owner.id);
    const usedStage = pipeline.stages[0];
    await createOpportunity(workspace.id, owner.id, {
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: usedStage.id } },
    });

    const inUse = await PipelineRepository.stagesInUse(
      pipeline.stages.map((s) => s.id),
    );
    expect(inUse.ok && inUse.value).toEqual([usedStage.id]);

    const count = await PipelineRepository.countOpportunities(pipeline.id);
    expect(count.ok && count.value).toBe(1);
  });

  it("update sincroniza etapas: atualiza, cria e remove", async () => {
    const { owner, workspace } = await scope();
    const pipeline = await createPipeline(workspace.id, owner.id, {
      stages: [
        { name: "Manter", category: "OPEN" },
        { name: "Remover", category: "OPEN" },
      ],
    });
    const keep = pipeline.stages[0];
    const drop = pipeline.stages[1];

    const result = await PipelineRepository.update(pipeline.id, {
      updatedById: owner.id,
      name: "Renomeado",
      removedStageIds: [drop.id],
      stages: [
        {
          id: keep.id,
          name: "Mantida",
          probability: 50,
          category: "OPEN",
          color: null,
        },
        { name: "Nova", probability: 100, category: "WON", color: null },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Renomeado");
      const names = result.value.stages
        .sort((a, b) => a.position - b.position)
        .map((s) => s.name);
      expect(names).toEqual(["Mantida", "Nova"]);
    }
  });

  it("softDelete marca deletedAt", async () => {
    const { owner, workspace } = await scope();
    const pipeline = await createPipeline(workspace.id, owner.id);
    const result = await PipelineRepository.softDelete(pipeline.id, owner.id);
    expect(result.ok).toBe(true);

    const reload = await PipelineRepository.findById(pipeline.id);
    expect(reload.ok && reload.value?.deletedAt).not.toBeNull();
  });
});
