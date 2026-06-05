import type { Pipeline, PipelineStage } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toPipelineDTO } from "@/src/mappers/pipeline.mapper";

const basePipeline: Pipeline = {
  id: "pl_1",
  workspaceId: "ws_1",
  name: "Vendas",
  position: 1,
  isDefault: true,
  createdById: "user_1",
  updatedById: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
};

function stage(overrides: Partial<PipelineStage>): PipelineStage {
  return {
    id: "st",
    pipelineId: "pl_1",
    name: "Etapa",
    position: 0,
    probability: 0,
    category: "OPEN",
    color: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("toPipelineDTO", () => {
  it("ordena as etapas por posição e mapeia campos", () => {
    const dto = toPipelineDTO({
      ...basePipeline,
      stages: [
        stage({ id: "b", name: "B", position: 2 }),
        stage({ id: "a", name: "A", position: 1 }),
      ],
    });
    expect(dto.isDefault).toBe(true);
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.stages.map((s) => s.id)).toEqual(["a", "b"]);
  });
});
