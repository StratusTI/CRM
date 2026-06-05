import { describe, expect, it } from "vitest";
import { createUser } from "@/src/__tests__/factories/user.factory";
import { createWorkspaceWithOwner } from "@/src/__tests__/factories/workspace.factory";
import {
  type CreateEmailCampaignData,
  EmailCampaignRepository,
} from "@/src/repositories/email-campaign.repository";

async function scope() {
  const owner = await createUser();
  const workspace = await createWorkspaceWithOwner(owner.id);
  return { owner, workspace };
}

function campaignData(
  workspaceId: string,
  createdById: string,
): CreateEmailCampaignData {
  return {
    workspaceId,
    createdById,
    subject: "Promo",
    contentHtml: "<p>oi</p>",
    contentJson: null,
    fromAddress: "no-reply@acme.com",
    status: "DRAFT",
    recipientScope: "SELECTED",
    scheduledAt: null,
  };
}

describe("EmailCampaignRepository (integração)", () => {
  it("createWithRecipients persiste campanha + destinatários numa transação", async () => {
    const { owner, workspace } = await scope();
    const result = await EmailCampaignRepository.createWithRecipients(
      campaignData(workspace.id, owner.id),
      [
        { personId: null, email: "a@b.com", name: "A" },
        { personId: null, email: "c@d.com", name: null },
      ],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recipients).toHaveLength(2);
      expect(result.value.recipients[0].email).toBe("a@b.com");
    }
  });

  it("createWithRecipients aceita zero destinatários", async () => {
    const { owner, workspace } = await scope();
    const result = await EmailCampaignRepository.createWithRecipients(
      campaignData(workspace.id, owner.id),
      [],
    );
    expect(result.ok && result.value.recipients).toHaveLength(0);
  });

  it("findByIdWithRecipients e listByWorkspace incluem recipients", async () => {
    const { owner, workspace } = await scope();
    const created = await EmailCampaignRepository.createWithRecipients(
      campaignData(workspace.id, owner.id),
      [{ personId: null, email: "a@b.com", name: "A" }],
    );
    if (!created.ok) throw new Error("setup");

    const found = await EmailCampaignRepository.findByIdWithRecipients(
      created.value.id,
    );
    expect(found.ok && found.value?.recipients).toHaveLength(1);

    const list = await EmailCampaignRepository.listByWorkspace(workspace.id);
    expect(list.ok && list.value).toHaveLength(1);

    const missing =
      await EmailCampaignRepository.findByIdWithRecipients("nope");
    expect(missing.ok && missing.value).toBeNull();
  });

  it("updateStatus carimba status e sentAt", async () => {
    const { owner, workspace } = await scope();
    const created = await EmailCampaignRepository.createWithRecipients(
      campaignData(workspace.id, owner.id),
      [],
    );
    if (!created.ok) throw new Error("setup");
    const sentAt = new Date();
    const updated = await EmailCampaignRepository.updateStatus(
      created.value.id,
      "SENT",
      sentAt,
    );
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.status).toBe("SENT");
      expect(updated.value.sentAt?.getTime()).toBe(sentAt.getTime());
    }
  });

  it("updateRecipient registra envio/erro", async () => {
    const { owner, workspace } = await scope();
    const created = await EmailCampaignRepository.createWithRecipients(
      campaignData(workspace.id, owner.id),
      [{ personId: null, email: "a@b.com", name: "A" }],
    );
    if (!created.ok) throw new Error("setup");
    const recipientId = created.value.recipients[0].id;
    const updated = await EmailCampaignRepository.updateRecipient(recipientId, {
      status: "SENT",
      providerMessageId: "msg-1",
      sentAt: new Date(),
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.status).toBe("SENT");
      expect(updated.value.providerMessageId).toBe("msg-1");
    }
  });
});
