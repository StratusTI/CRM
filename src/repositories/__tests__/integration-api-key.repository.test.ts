import { describe, expect, it } from "vitest";
import { createIntegrationApiKey } from "@/src/__tests__/factories/integration-api-key.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { IntegrationApiKeyRepository } from "@/src/repositories/integration-api-key.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("IntegrationApiKeyRepository (integração)", () => {
  it("create persiste hash + prefix sem token", async () => {
    const { owner, workspace } = await scope();
    const result = await IntegrationApiKeyRepository.create({
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "CI",
      keyHash: "hash-1",
      prefix: "nx_abc",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.keyHash).toBe("hash-1");
      expect(result.value.revokedAt).toBeNull();
    }
  });

  it("findActiveByHash ignora revogadas", async () => {
    const { owner, workspace } = await scope();
    const { key } = await createIntegrationApiKey(workspace.id, owner.id);

    const found = await IntegrationApiKeyRepository.findActiveByHash(
      key.keyHash,
    );
    expect(found.ok && found.value?.id).toBe(key.id);

    await IntegrationApiKeyRepository.revoke(key.id);
    const afterRevoke = await IntegrationApiKeyRepository.findActiveByHash(
      key.keyHash,
    );
    expect(afterRevoke.ok && afterRevoke.value).toBeNull();
  });

  it("listByWorkspace traz revogadas e ativas", async () => {
    const { owner, workspace } = await scope();
    const a = await createIntegrationApiKey(workspace.id, owner.id);
    await createIntegrationApiKey(workspace.id, owner.id);
    await IntegrationApiKeyRepository.revoke(a.key.id);

    const list = await IntegrationApiKeyRepository.listByWorkspace(
      workspace.id,
    );
    expect(list.ok && list.value).toHaveLength(2);
  });

  it("touchLastUsed carimba lastUsedAt sem lançar", async () => {
    const { owner, workspace } = await scope();
    const { key } = await createIntegrationApiKey(workspace.id, owner.id);
    await IntegrationApiKeyRepository.touchLastUsed(key.id);
    const found = await IntegrationApiKeyRepository.findById(key.id);
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value?.lastUsedAt).not.toBeNull();
  });

  it("touchLastUsed em id inexistente é no-op silencioso", async () => {
    await expect(
      IntegrationApiKeyRepository.touchLastUsed("nope"),
    ).resolves.toBeUndefined();
  });
});
