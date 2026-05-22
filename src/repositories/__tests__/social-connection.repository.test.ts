import { describe, expect, it } from "vitest";
import { createSocialConnection } from "@/src/__tests__/factories/social-connection.factory";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import { SocialConnectionRepository } from "@/src/repositories/social-connection.repository";

async function workspaceAndOwner() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

describe("SocialConnectionRepository (integração)", () => {
  it("listByWorkspace retorna só as conexões da workspace", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    const other = await workspaceAndOwner();

    await createSocialConnection(workspace.id, owner.id, {
      platform: "INSTAGRAM",
    });
    await createSocialConnection(workspace.id, owner.id, {
      platform: "FACEBOOK",
    });
    await createSocialConnection(other.workspace.id, other.owner.id);

    const result = await SocialConnectionRepository.listByWorkspace(
      workspace.id,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });

  it("upsertByPlatform cria e depois substitui os tokens (reconectar)", async () => {
    const { owner, workspace } = await workspaceAndOwner();

    const created = await SocialConnectionRepository.upsertByPlatform({
      workspaceId: workspace.id,
      platform: "TIKTOK",
      createdById: owner.id,
      externalAccountId: "tk-1",
      accountName: "@first",
      accessToken: "cipher-1",
      refreshToken: "refresh-1",
      tokenExpiresAt: null,
      scope: "user.info.basic",
    });
    expect(created.ok && created.value.accessToken).toBe("cipher-1");

    const updated = await SocialConnectionRepository.upsertByPlatform({
      workspaceId: workspace.id,
      platform: "TIKTOK",
      createdById: owner.id,
      externalAccountId: "tk-1",
      accountName: "@second",
      accessToken: "cipher-2",
      refreshToken: "refresh-2",
      tokenExpiresAt: null,
      scope: "user.info.basic",
    });

    expect(updated.ok).toBe(true);
    if (updated.ok && created.ok) {
      expect(updated.value.id).toBe(created.value.id); // mesma linha
      expect(updated.value.accessToken).toBe("cipher-2");
      expect(updated.value.accountName).toBe("@second");
    }

    const list = await SocialConnectionRepository.listByWorkspace(workspace.id);
    expect(list.ok && list.value).toHaveLength(1); // não duplicou
  });

  it("findByWorkspaceAndPlatform isola por plataforma", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    await createSocialConnection(workspace.id, owner.id, {
      platform: "YOUTUBE",
    });

    const found = await SocialConnectionRepository.findByWorkspaceAndPlatform(
      workspace.id,
      "YOUTUBE",
    );
    expect(found.ok && found.value).not.toBeNull();

    const missing = await SocialConnectionRepository.findByWorkspaceAndPlatform(
      workspace.id,
      "INSTAGRAM",
    );
    expect(missing.ok && missing.value).toBeNull();
  });

  it("deleteByPlatform remove e sinaliza ausência", async () => {
    const { owner, workspace } = await workspaceAndOwner();
    await createSocialConnection(workspace.id, owner.id, {
      platform: "FACEBOOK",
    });

    const removed = await SocialConnectionRepository.deleteByPlatform(
      workspace.id,
      "FACEBOOK",
    );
    expect(removed.ok && removed.value).toBe(true);

    const again = await SocialConnectionRepository.deleteByPlatform(
      workspace.id,
      "FACEBOOK",
    );
    expect(again.ok && again.value).toBe(false);
  });
});
