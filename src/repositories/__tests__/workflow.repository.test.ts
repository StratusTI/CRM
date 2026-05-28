import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import {
  createWorkflow,
  createWorkflowRun,
  createWorkflowVersion,
  emptyDefinition,
} from "@/src/__tests__/factories/workflow.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { WorkflowRepository } from "@/src/repositories/workflow.repository";
import { WorkflowRunRepository } from "@/src/repositories/workflow-run.repository";
import { WorkflowVersionRepository } from "@/src/repositories/workflow-version.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("WorkflowRepository (integração)", () => {
  it("create cria o workflow + draft inicial", async () => {
    const { owner, workspace } = await scope();
    const result = await WorkflowRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Onboarding",
      description: null,
      initialDefinition: emptyDefinition(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.versions).toHaveLength(1);
      expect(result.value.versions[0].status).toBe("DRAFT");
    }
  });

  it("listByWorkspace ignora deletados e outras workspaces", async () => {
    const { owner, workspace } = await scope();
    const other = await scope();
    const keep = await createWorkflow(workspace.id, owner.id);
    const removed = await createWorkflow(workspace.id, owner.id);
    await createWorkflow(other.workspace.id, other.owner.id);
    await WorkflowRepository.softDelete(removed.id, owner.id);
    const result = await WorkflowRepository.listByWorkspace(workspace.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(keep.id);
    }
  });

  it("findActiveByWebhookToken encontra match no JSON", async () => {
    const { owner, workspace } = await scope();
    const wf = await createWorkflow(workspace.id, owner.id, {
      status: "ACTIVE",
    });
    const def = emptyDefinition();
    def.trigger.data = { type: "webhook", token: "secret-token-abcdef" };
    const v = await createWorkflowVersion(wf.id, {
      status: "ACTIVE",
      definition: def,
    });
    const { prisma } = await import("@/src/lib/prisma");
    await prisma.workflow.update({
      where: { id: wf.id },
      data: { activeVersionId: v.id },
    });
    const result = await WorkflowRepository.findActiveByWebhookToken(
      "secret-token-abcdef",
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.id).toBe(wf.id);
    } else {
      expect.fail("expected match");
    }
  });
});

describe("WorkflowVersionRepository.activateDraft", () => {
  it("arquiva a versão ACTIVE anterior, promove o DRAFT e cria novo DRAFT", async () => {
    const { owner, workspace } = await scope();
    const wf = await createWorkflow(workspace.id, owner.id);
    const previousActive = await createWorkflowVersion(wf.id, {
      version: 1,
      status: "ACTIVE",
    });
    const draft = await createWorkflowVersion(wf.id, {
      version: 2,
      status: "DRAFT",
    });
    const result = await WorkflowVersionRepository.activateDraft(
      wf.id,
      draft.id,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activated.id).toBe(draft.id);
    expect(result.value.activated.status).toBe("ACTIVE");
    expect(result.value.newDraft.status).toBe("DRAFT");
    expect(result.value.newDraft.version).toBe(3);

    const archived = await WorkflowVersionRepository.findById(
      previousActive.id,
    );
    if (archived.ok && archived.value) {
      expect(archived.value.status).toBe("ARCHIVED");
    }
  });
});

describe("WorkflowRunRepository", () => {
  it("create + setStatus + createStep", async () => {
    const { owner, workspace } = await scope();
    const wf = await createWorkflow(workspace.id, owner.id);
    const v = await createWorkflowVersion(wf.id);
    const run = await createWorkflowRun(wf.id, v.id);

    const transition = await WorkflowRunRepository.setStatus(run.id, "RUNNING");
    expect(transition.ok).toBe(true);

    const step = await WorkflowRunRepository.createStep({
      runId: run.id,
      nodeId: "n1",
      nodeType: "delay",
      status: "RUNNING",
    });
    expect(step.ok).toBe(true);

    const loaded = await WorkflowRunRepository.findById(run.id);
    if (loaded.ok && loaded.value) {
      expect(loaded.value.steps).toHaveLength(1);
      expect(loaded.value.status).toBe("RUNNING");
    }
  });
});
