import type { Pipeline, PipelineStage, StageCategory } from "@prisma/client";

type StageSeed = {
  name: string;
  probability?: number;
  category?: StageCategory;
  color?: string | null;
};

type PipelineOverrides = {
  name?: string;
  isDefault?: boolean;
  stages?: StageSeed[];
};

const DEFAULT_STAGES: StageSeed[] = [
  { name: "Novo", probability: 10, category: "OPEN" },
  { name: "Ganho", probability: 100, category: "WON" },
  { name: "Perdido", probability: 0, category: "LOST" },
];

/** Cria um pipeline real (com etapas) no banco de testes. */
export async function createPipeline(
  workspaceId: string,
  createdById: string,
  overrides: PipelineOverrides = {},
): Promise<Pipeline & { stages: PipelineStage[] }> {
  const { prisma } = await import("@/src/lib/prisma");
  const stages = overrides.stages ?? DEFAULT_STAGES;
  return prisma.pipeline.create({
    data: {
      name: overrides.name ?? "Funil de Teste",
      isDefault: overrides.isDefault ?? false,
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
      stages: {
        create: stages.map((stage, index) => ({
          name: stage.name,
          probability: stage.probability ?? 0,
          category: stage.category ?? "OPEN",
          color: stage.color ?? null,
          position: index + 1,
        })),
      },
    },
    include: { stages: { orderBy: { position: "asc" } } },
  });
}
