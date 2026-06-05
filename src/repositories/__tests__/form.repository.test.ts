import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LEAD_FIELDS } from "@/src/__tests__/factories/form.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import {
  type CreateFormData,
  FormRepository,
} from "@/src/repositories/form.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

function formData(
  workspaceId: string,
  createdById: string,
  overrides: Partial<CreateFormData> = {},
): CreateFormData {
  return {
    workspaceId,
    createdById,
    name: "Contato",
    description: null,
    action: "LEAD",
    fields: LEAD_FIELDS,
    actionConfig: {},
    successMessage: null,
    redirectUrl: null,
    publicToken: randomUUID().replace(/-/g, ""),
    ...overrides,
  };
}

describe("FormRepository (integração)", () => {
  it("create persiste fields/actionConfig como JSON", async () => {
    const { owner, workspace } = await scope();
    const result = await FormRepository.create(
      formData(workspace.id, owner.id),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe("LEAD");
      expect(Array.isArray(result.value.fields)).toBe(true);
    }
  });

  it("findByPublicToken resolve ativo e ignora deletado", async () => {
    const { owner, workspace } = await scope();
    const token = "tok-pub-1";
    const created = await FormRepository.create(
      formData(workspace.id, owner.id, { publicToken: token }),
    );
    if (!created.ok) throw new Error("setup");

    const found = await FormRepository.findByPublicToken(token);
    expect(found.ok && found.value?.id).toBe(created.value.id);

    await FormRepository.softDelete(created.value.id, owner.id);
    const afterDelete = await FormRepository.findByPublicToken(token);
    expect(afterDelete.ok && afterDelete.value).toBeNull();
  });

  it("listByWorkspace ignora deletados e respeita position", async () => {
    const { owner, workspace } = await scope();
    const a = await FormRepository.create(formData(workspace.id, owner.id));
    const b = await FormRepository.create(formData(workspace.id, owner.id));
    if (!a.ok || !b.ok) throw new Error("setup");

    await FormRepository.reorder(workspace.id, [b.value.id, a.value.id]);
    const list = await FormRepository.listByWorkspace(workspace.id);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value).toHaveLength(2);
      expect(list.value[0].id).toBe(b.value.id);
    }
  });

  it("update mescla campos JSON e escalares", async () => {
    const { owner, workspace } = await scope();
    const created = await FormRepository.create(
      formData(workspace.id, owner.id),
    );
    if (!created.ok) throw new Error("setup");
    const updated = await FormRepository.update(created.value.id, {
      updatedById: owner.id,
      name: "Renomeado",
      status: "PUBLISHED",
      actionConfig: { icp: true },
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.name).toBe("Renomeado");
      expect(updated.value.status).toBe("PUBLISHED");
    }
  });

  it("recordSubmission cria submissão e incrementa contador", async () => {
    const { owner, workspace } = await scope();
    const created = await FormRepository.create(
      formData(workspace.id, owner.id),
    );
    if (!created.ok) throw new Error("setup");

    const sub = await FormRepository.recordSubmission({
      formId: created.value.id,
      action: "LEAD",
      values: { nome: "Ana" },
      createdPersonId: null,
      createdCompanyId: null,
      createdOpportunityId: null,
      personReused: false,
      ipHash: null,
      referrer: null,
    });
    expect(sub.ok).toBe(true);

    const reloaded = await FormRepository.findById(created.value.id);
    expect(reloaded.ok && reloaded.value?.submissionCount).toBe(1);

    const list = await FormRepository.listSubmissions(created.value.id);
    expect(list.ok && list.value).toHaveLength(1);

    const wsList = await FormRepository.listSubmissionsByWorkspace(
      workspace.id,
    );
    expect(wsList.ok).toBe(true);
    if (wsList.ok) {
      expect(wsList.value).toHaveLength(1);
      expect(wsList.value[0].form.name).toBe("Contato");
    }
  });
});
