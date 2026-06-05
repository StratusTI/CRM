import { describe, expect, it } from "vitest";
import { createActivity } from "@/src/__tests__/factories/activity.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { ActivityRepository } from "@/src/repositories/activity.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("ActivityRepository (integração)", () => {
  it("listByRecord filtra pelo vínculo e ordena por recência", async () => {
    const { owner, workspace } = await scope();
    await createActivity(workspace.id, {
      actorUserId: owner.id,
      companyId: "co_1",
      summary: "antiga",
    });
    await createActivity(workspace.id, {
      actorUserId: owner.id,
      companyId: "co_1",
      action: "UPDATED",
      summary: "recente",
    });
    // outra empresa — não deve aparecer
    await createActivity(workspace.id, { companyId: "co_2" });

    const result = await ActivityRepository.listByRecord(
      workspace.id,
      "companyId",
      "co_1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].summary).toBe("recente"); // desc
    }
  });

  it("listByWorkspace aplica filtros de entidade e ação", async () => {
    const { owner, workspace } = await scope();
    await createActivity(workspace.id, {
      actorUserId: owner.id,
      entity: "company",
      action: "CREATED",
    });
    await createActivity(workspace.id, {
      actorUserId: owner.id,
      entity: "person",
      action: "DELETED",
    });

    const onlyDeleted = await ActivityRepository.listByWorkspace(workspace.id, {
      action: "DELETED",
      limit: 100,
    });
    expect(onlyDeleted.ok && onlyDeleted.value).toHaveLength(1);
    expect(onlyDeleted.ok && onlyDeleted.value[0].entity).toBe("person");

    const onlyCompany = await ActivityRepository.listByWorkspace(workspace.id, {
      entity: "company",
      limit: 100,
    });
    expect(onlyCompany.ok && onlyCompany.value).toHaveLength(1);
  });

  it("respeita o limite", async () => {
    const { workspace } = await scope();
    for (let i = 0; i < 5; i++) {
      await createActivity(workspace.id, { companyId: "co_x" });
    }
    const result = await ActivityRepository.listByRecord(
      workspace.id,
      "companyId",
      "co_x",
      3,
    );
    expect(result.ok && result.value).toHaveLength(3);
  });
});
