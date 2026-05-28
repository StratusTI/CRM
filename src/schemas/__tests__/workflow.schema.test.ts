import { describe, expect, it } from "vitest";
import {
  CreateWorkflowSchema,
  UpdateWorkflowDraftSchema,
  UpdateWorkflowSchema,
  WorkflowDefinitionSchema,
  WorkflowNodeDataSchema,
  WorkflowTriggerDataSchema,
} from "@/src/schemas/workflow.schema";

const emptyTrigger = {
  id: "trigger" as const,
  position: { x: 0, y: 0 },
  data: null,
};

describe("CreateWorkflowSchema", () => {
  it("aceita só name", () => {
    expect(CreateWorkflowSchema.safeParse({ name: "Onboarding" }).success).toBe(
      true,
    );
  });

  it("rejeita name vazio", () => {
    expect(CreateWorkflowSchema.safeParse({ name: " " }).success).toBe(false);
  });
});

describe("UpdateWorkflowSchema", () => {
  it("aceita patch parcial", () => {
    expect(UpdateWorkflowSchema.safeParse({ status: "ACTIVE" }).success).toBe(
      true,
    );
  });

  it("rejeita payload vazio", () => {
    expect(UpdateWorkflowSchema.safeParse({}).success).toBe(false);
  });
});

describe("WorkflowTriggerDataSchema", () => {
  it("aceita record-is-created com entity válida", () => {
    expect(
      WorkflowTriggerDataSchema.safeParse({
        type: "record-is-created",
        entity: "person",
      }).success,
    ).toBe(true);
  });

  it("rejeita entity desconhecida", () => {
    expect(
      WorkflowTriggerDataSchema.safeParse({
        type: "record-is-created",
        entity: "foo",
      }).success,
    ).toBe(false);
  });

  it("aceita on-a-schedule com cron", () => {
    expect(
      WorkflowTriggerDataSchema.safeParse({
        type: "on-a-schedule",
        cron: "*/5 * * * *",
        timezone: "America/Sao_Paulo",
      }).success,
    ).toBe(true);
  });

  it("aceita webhook com token", () => {
    expect(
      WorkflowTriggerDataSchema.safeParse({
        type: "webhook",
        token: "abc12345",
      }).success,
    ).toBe(true);
  });
});

describe("WorkflowNodeDataSchema", () => {
  it("aceita create-record com fields", () => {
    expect(
      WorkflowNodeDataSchema.safeParse({
        type: "create-record",
        entity: "task",
        fields: { title: "Follow up", body: "{{trigger.record.name}}" },
      }).success,
    ).toBe(true);
  });

  it("aceita if-else com conditions", () => {
    expect(
      WorkflowNodeDataSchema.safeParse({
        type: "if-else",
        conditions: [
          {
            field: "{{trigger.record.stage}}",
            operator: "equals",
            value: "WON",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("aceita form com pelo menos um field", () => {
    expect(
      WorkflowNodeDataSchema.safeParse({
        type: "form",
        fields: [{ name: "approved", type: "boolean", required: true }],
      }).success,
    ).toBe(true);
  });

  it("rejeita form sem fields", () => {
    expect(
      WorkflowNodeDataSchema.safeParse({ type: "form", fields: [] }).success,
    ).toBe(false);
  });

  it("aceita delay com unidade", () => {
    expect(
      WorkflowNodeDataSchema.safeParse({
        type: "delay",
        amount: 30,
        unit: "minutes",
      }).success,
    ).toBe(true);
  });
});

describe("WorkflowDefinitionSchema", () => {
  it("aceita workflow só com trigger vazio", () => {
    expect(
      WorkflowDefinitionSchema.safeParse({
        trigger: emptyTrigger,
        nodes: [],
        edges: [],
      }).success,
    ).toBe(true);
  });

  it("rejeita edge apontando pra node inexistente", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      trigger: emptyTrigger,
      nodes: [],
      edges: [{ id: "e1", source: "trigger", target: "fantasma" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita ids de node duplicados", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      trigger: emptyTrigger,
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { type: "delay", amount: 1, unit: "minutes" },
        },
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { type: "delay", amount: 2, unit: "minutes" },
        },
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it("aceita grafo conectado trigger → node", () => {
    const result = WorkflowDefinitionSchema.safeParse({
      trigger: {
        id: "trigger",
        position: { x: 0, y: 0 },
        data: { type: "launch-manually", inputs: [] },
      },
      nodes: [
        {
          id: "n1",
          position: { x: 200, y: 0 },
          data: {
            type: "create-record",
            entity: "task",
            fields: { title: "Hi" },
          },
        },
      ],
      edges: [{ id: "e1", source: "trigger", target: "n1" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateWorkflowDraftSchema", () => {
  it("exige definition válido", () => {
    expect(
      UpdateWorkflowDraftSchema.safeParse({
        definition: { trigger: emptyTrigger, nodes: [], edges: [] },
      }).success,
    ).toBe(true);
  });
});
