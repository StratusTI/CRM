import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";
import type { WorkflowDefinition } from "@/src/schemas/workflow.schema";

const { findAllActive, updateWorkflow, createRun, runWorkflow } = vi.hoisted(
  () => ({
    findAllActive: vi.fn(),
    updateWorkflow: vi.fn(),
    createRun: vi.fn(),
    runWorkflow: vi.fn(() => Promise.resolve()),
  }),
);

vi.mock("@/src/repositories/workflow.repository", () => ({
  WorkflowRepository: { findAllActive, update: updateWorkflow },
}));
vi.mock("@/src/repositories/workflow-run.repository", () => ({
  WorkflowRunRepository: { create: createRun },
}));
vi.mock("@/src/services/workflow-runner", () => ({
  runWorkflow,
}));

import { workflowSchedulerTick } from "@/src/services/workflow-scheduler";

function defWithCron(cron: string): WorkflowDefinition {
  return {
    trigger: {
      id: "trigger",
      position: { x: 0, y: 0 },
      data: { type: "on-a-schedule", cron, timezone: "UTC" },
    },
    nodes: [],
    edges: [],
  };
}

function workflow(opts: {
  cron: string;
  lastRunAt?: Date | null;
}) {
  return {
    id: "wf1",
    workspaceId: "ws1",
    createdById: "u1",
    lastRunAt: opts.lastRunAt ?? null,
    activeVersion: {
      id: "v1",
      definition: defWithCron(opts.cron),
    },
  };
}

describe("workflowSchedulerTick", () => {
  beforeEach(() => {
    findAllActive.mockReset();
    updateWorkflow.mockReset();
    createRun.mockReset();
    runWorkflow.mockReset();
    updateWorkflow.mockResolvedValue(ok({}));
    createRun.mockResolvedValue(ok({ id: "run1" }));
  });

  it("dispara workflow cujo cron casa com o minuto atual", async () => {
    // "*/5 * * * *" → última execução em 12:05:00
    findAllActive.mockResolvedValue(
      ok([workflow({ cron: "*/5 * * * *" })]),
    );
    const now = new Date("2026-05-28T12:05:30Z");
    const result = await workflowSchedulerTick(now);
    expect(result.dispatched).toBe(1);
    expect(createRun).toHaveBeenCalledTimes(1);
    expect(updateWorkflow).toHaveBeenCalledWith("wf1", {
      updatedById: "u1",
      lastRunAt: expect.any(Date),
    });
  });

  it("não dispara duas vezes se lastRunAt já é o previousRun atual", async () => {
    const previousRun = new Date("2026-05-28T12:05:00Z");
    findAllActive.mockResolvedValue(
      ok([workflow({ cron: "*/5 * * * *", lastRunAt: previousRun })]),
    );
    const now = new Date("2026-05-28T12:05:45Z");
    const result = await workflowSchedulerTick(now);
    expect(result.dispatched).toBe(0);
    expect(createRun).not.toHaveBeenCalled();
  });

  it("respeita tolerância — não dispara backlog antigo", async () => {
    // Cron diário às 09:00; now = 16:00 do mesmo dia → previousRun é 9h atrás.
    findAllActive.mockResolvedValue(ok([workflow({ cron: "0 9 * * *" })]));
    const now = new Date("2026-05-28T16:00:00Z");
    const result = await workflowSchedulerTick(now);
    expect(result.dispatched).toBe(0);
  });

  it("ignora workflows sem trigger on-a-schedule", async () => {
    findAllActive.mockResolvedValue(
      ok([
        {
          id: "wf1",
          workspaceId: "ws1",
          createdById: "u1",
          lastRunAt: null,
          activeVersion: {
            id: "v1",
            definition: {
              trigger: {
                id: "trigger",
                position: { x: 0, y: 0 },
                data: { type: "launch-manually", inputs: [] },
              },
              nodes: [],
              edges: [],
            },
          },
        },
      ]),
    );
    const result = await workflowSchedulerTick(new Date());
    expect(result.considered).toBe(0);
  });
});
