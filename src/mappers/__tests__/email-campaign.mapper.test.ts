import type { EmailCampaign, EmailCampaignRecipient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toEmailCampaignDTO,
  toEmailCampaignRecipientDTO,
  toEmailCampaignWithRecipientsDTO,
} from "@/src/mappers/email-campaign.mapper";

const D = new Date("2026-01-01T00:00:00.000Z");

const campaign: EmailCampaign = {
  id: "c1",
  subject: "Promo",
  contentHtml: "<p>oi</p>",
  contentJson: null,
  fromAddress: "no-reply@acme.com",
  status: "DRAFT",
  recipientScope: "ALL",
  scheduledAt: null,
  sentAt: null,
  workspaceId: "w1",
  createdById: "u1",
  createdAt: D,
  updatedAt: D,
};

function recipient(
  overrides: Partial<EmailCampaignRecipient> = {},
): EmailCampaignRecipient {
  return {
    id: "r1",
    campaignId: "c1",
    personId: null,
    email: "a@b.com",
    name: null,
    status: "PENDING",
    providerMessageId: null,
    errorMessage: null,
    sentAt: null,
    createdAt: D,
    updatedAt: D,
    ...overrides,
  };
}

describe("toEmailCampaignRecipientDTO", () => {
  it("serializa datas e preserva nulos", () => {
    const dto = toEmailCampaignRecipientDTO(recipient());
    expect(dto.sentAt).toBeNull();
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("serializa sentAt quando presente", () => {
    const dto = toEmailCampaignRecipientDTO(recipient({ sentAt: D }));
    expect(dto.sentAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("toEmailCampaignDTO", () => {
  it("mapeia recipientScope ALL → all e conta status", () => {
    const dto = toEmailCampaignDTO(campaign, [
      recipient({ status: "SENT" }),
      recipient({ id: "r2", status: "FAILED" }),
      recipient({ id: "r3", status: "PENDING" }),
    ]);
    expect(dto.recipientScope).toBe("all");
    expect(dto.recipientCount).toBe(3);
    expect(dto.sentCount).toBe(1);
    expect(dto.failedCount).toBe(1);
  });

  it("mapeia recipientScope SELECTED → selected e serializa scheduledAt/sentAt", () => {
    const dto = toEmailCampaignDTO(
      { ...campaign, recipientScope: "SELECTED", scheduledAt: D, sentAt: D },
      [],
    );
    expect(dto.recipientScope).toBe("selected");
    expect(dto.scheduledAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.sentAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("toEmailCampaignWithRecipientsDTO", () => {
  it("inclui a lista de destinatários", () => {
    const dto = toEmailCampaignWithRecipientsDTO(campaign, [recipient()]);
    expect(dto.recipients).toHaveLength(1);
    expect(dto.recipients[0].id).toBe("r1");
  });
});
