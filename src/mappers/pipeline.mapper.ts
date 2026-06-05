import type { Pipeline, PipelineStage } from "@prisma/client";
import type {
  PipelineDTO,
  PipelineStageDTO,
} from "@/src/schemas/pipeline.schema";

/** `Prisma.PipelineStage` → `PipelineStageDTO`. */
export function toPipelineStageDTO(stage: PipelineStage): PipelineStageDTO {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    name: stage.name,
    position: stage.position,
    probability: stage.probability,
    category: stage.category,
    color: stage.color,
  };
}

/** `Prisma.Pipeline` (com `stages`) → `PipelineDTO` (etapas ordenadas). */
export function toPipelineDTO(
  pipeline: Pipeline & { stages: PipelineStage[] },
): PipelineDTO {
  return {
    id: pipeline.id,
    name: pipeline.name,
    position: pipeline.position,
    isDefault: pipeline.isDefault,
    workspaceId: pipeline.workspaceId,
    createdById: pipeline.createdById,
    updatedById: pipeline.updatedById,
    createdAt: pipeline.createdAt.toISOString(),
    updatedAt: pipeline.updatedAt.toISOString(),
    stages: [...pipeline.stages]
      .sort((a, b) => a.position - b.position)
      .map(toPipelineStageDTO),
  };
}
