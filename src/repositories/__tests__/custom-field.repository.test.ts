import { describe, expect, it } from "vitest";
import { createCustomFieldDef } from "@/src/__tests__/factories/custom-field.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { CustomFieldRepository } from "@/src/repositories/custom-field.repository";
import { CustomFieldValueRepository } from "@/src/repositories/custom-field-value.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("CustomFieldRepository (integração)", () => {
  it("create incrementa position por entidade", async () => {
    const { owner, workspace } = await scope();
    const a = await CustomFieldRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      entity: "COMPANY",
      key: "a",
      label: "A",
      type: "TEXT",
      options: [],
      required: false,
    });
    const b = await CustomFieldRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      entity: "COMPANY",
      key: "b",
      label: "B",
      type: "TEXT",
      options: [],
      required: false,
    });
    expect(a.ok && a.value.position).toBe(1);
    expect(b.ok && b.value.position).toBe(2);
  });

  it("listByWorkspace filtra por entidade e ignora deletados", async () => {
    const { owner, workspace } = await scope();
    await createCustomFieldDef(workspace.id, owner.id, {
      entity: "COMPANY",
      key: "c1",
    });
    await createCustomFieldDef(workspace.id, owner.id, {
      entity: "PERSON",
      key: "p1",
    });
    const removed = await createCustomFieldDef(workspace.id, owner.id, {
      entity: "COMPANY",
      key: "c2",
    });
    await CustomFieldRepository.softDelete(removed.id, owner.id);

    const companies = await CustomFieldRepository.listByWorkspace(
      workspace.id,
      "COMPANY",
    );
    expect(companies.ok && companies.value).toHaveLength(1);
    expect(companies.ok && companies.value[0].key).toBe("c1");
  });

  it("existsByKey respeita entidade e soft-delete", async () => {
    const { owner, workspace } = await scope();
    await createCustomFieldDef(workspace.id, owner.id, {
      entity: "COMPANY",
      key: "dup",
    });
    const taken = await CustomFieldRepository.existsByKey(
      workspace.id,
      "COMPANY",
      "dup",
    );
    expect(taken.ok && taken.value).toBe(true);
    const otherEntity = await CustomFieldRepository.existsByKey(
      workspace.id,
      "PERSON",
      "dup",
    );
    expect(otherEntity.ok && otherEntity.value).toBe(false);
  });
});

describe("CustomFieldValueRepository (integração)", () => {
  it("upsert e remoção por null", async () => {
    const { owner, workspace } = await scope();
    const def = await createCustomFieldDef(workspace.id, owner.id);

    await CustomFieldValueRepository.applyForRecord([
      { definitionId: def.id, recordId: "rec_x", value: "v1" },
    ]);
    let values = await CustomFieldValueRepository.listByRecords(["rec_x"]);
    expect(values.ok && values.value).toHaveLength(1);

    await CustomFieldValueRepository.applyForRecord([
      { definitionId: def.id, recordId: "rec_x", value: "v2" },
    ]);
    values = await CustomFieldValueRepository.listByRecords(["rec_x"]);
    expect(values.ok && values.value[0].value).toBe("v2");

    await CustomFieldValueRepository.applyForRecord([
      { definitionId: def.id, recordId: "rec_x", value: null },
    ]);
    values = await CustomFieldValueRepository.listByRecords(["rec_x"]);
    expect(values.ok && values.value).toHaveLength(0);
  });
});
