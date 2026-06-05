import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { QuotaRepository } from "@/src/repositories/quota.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("QuotaRepository (integração)", () => {
  it("upsert cria e depois atualiza pela chave única (sem duplicar)", async () => {
    const { owner, workspace } = await scope();
    const data = {
      workspaceId: workspace.id,
      createdById: owner.id,
      ownerId: owner.id,
      period: "MONTH" as const,
      periodKey: "2026-06",
      targetAmount: 10000,
    };

    const first = await QuotaRepository.upsert(data);
    expect(first.ok).toBe(true);

    const second = await QuotaRepository.upsert({
      ...data,
      targetAmount: 25000,
    });
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.value.id).toBe(first.value.id);
      expect(second.value.targetAmount.toString()).toBe("25000");
    }

    const all = await QuotaRepository.listByWorkspace(workspace.id);
    expect(all.ok && all.value).toHaveLength(1);
  });

  it("listByWorkspaceAndPeriod filtra por granularidade", async () => {
    const { owner, workspace } = await scope();
    await QuotaRepository.upsert({
      workspaceId: workspace.id,
      createdById: owner.id,
      ownerId: owner.id,
      period: "MONTH",
      periodKey: "2026-06",
      targetAmount: 1000,
    });
    await QuotaRepository.upsert({
      workspaceId: workspace.id,
      createdById: owner.id,
      ownerId: owner.id,
      period: "QUARTER",
      periodKey: "2026-Q2",
      targetAmount: 5000,
    });

    const months = await QuotaRepository.listByWorkspaceAndPeriod(
      workspace.id,
      "MONTH",
    );
    expect(months.ok && months.value).toHaveLength(1);
    expect(months.ok && months.value[0].periodKey).toBe("2026-06");
  });
});
