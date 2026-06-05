import type { Opportunity, Prisma } from "@prisma/client";

type OpportunityOverrides = Partial<
  Omit<Prisma.OpportunityCreateInput, "workspace" | "createdBy">
>;

/**
 * Cria uma oportunidade real no banco de testes, escopada a workspace + criador.
 * Quando `pipeline`/`stage` não são informados, conecta o pipeline padrão da
 * workspace e sua primeira etapa (semeados pela factory de workspace).
 */
export async function createOpportunity(
  workspaceId: string,
  createdById: string,
  overrides: OpportunityOverrides = {},
): Promise<Opportunity> {
  const { prisma } = await import("@/src/lib/prisma");

  let stageRef = overrides.stage;
  let pipelineRef = overrides.pipeline;
  if (!stageRef || !pipelineRef) {
    const pipeline = await prisma.pipeline.findFirstOrThrow({
      where: { workspaceId, isDefault: true, deletedAt: null },
      include: { stages: { orderBy: { position: "asc" } } },
    });
    pipelineRef = { connect: { id: pipeline.id } };
    stageRef = { connect: { id: pipeline.stages[0].id } };
  }

  const { stage: _stage, pipeline: _pipeline, ...rest } = overrides;
  return prisma.opportunity.create({
    data: {
      name: overrides.name ?? "Big Deal",
      ...rest,
      pipeline: pipelineRef,
      stage: stageRef,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
    },
  });
}
