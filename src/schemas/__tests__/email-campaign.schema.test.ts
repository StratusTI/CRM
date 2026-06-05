import { describe, expect, it } from "vitest";
import {
  CreateEmailCampaignSchema,
  EmailCampaignOutputSchema,
  EmailCampaignWithRecipientsSchema,
} from "@/src/schemas/email-campaign.schema";

const base = {
  subject: "Promoção",
  contentHtml: "<p>oi</p>",
  recipientScope: "all" as const,
};

describe("CreateEmailCampaignSchema", () => {
  it("aceita escopo 'all' sem destinatários explícitos", () => {
    expect(CreateEmailCampaignSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita assunto vazio", () => {
    expect(
      CreateEmailCampaignSchema.safeParse({ ...base, subject: "  " }).success,
    ).toBe(false);
  });

  it("rejeita conteúdo vazio", () => {
    expect(
      CreateEmailCampaignSchema.safeParse({ ...base, contentHtml: "" }).success,
    ).toBe(false);
  });

  it("exige destinatário quando escopo = selected", () => {
    const parsed = CreateEmailCampaignSchema.safeParse({
      ...base,
      recipientScope: "selected",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues[0].path).toContain("personIds");
  });

  it("aceita selected com personIds", () => {
    expect(
      CreateEmailCampaignSchema.safeParse({
        ...base,
        recipientScope: "selected",
        personIds: ["p_1"],
      }).success,
    ).toBe(true);
  });

  it("aceita selected via mailingListIds ou extraEmails", () => {
    expect(
      CreateEmailCampaignSchema.safeParse({
        ...base,
        recipientScope: "selected",
        mailingListIds: ["l_1"],
      }).success,
    ).toBe(true);
    expect(
      CreateEmailCampaignSchema.safeParse({
        ...base,
        recipientScope: "selected",
        extraEmails: ["a@b.com"],
      }).success,
    ).toBe(true);
  });

  it("rejeita email avulso inválido", () => {
    expect(
      CreateEmailCampaignSchema.safeParse({
        ...base,
        recipientScope: "selected",
        extraEmails: ["nao-eh-email"],
      }).success,
    ).toBe(false);
  });

  it("aceita scheduledAt ISO", () => {
    expect(
      CreateEmailCampaignSchema.safeParse({
        ...base,
        scheduledAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});

describe("EmailCampaign output schemas", () => {
  const dto = {
    id: "c_1",
    subject: "S",
    contentHtml: "<p></p>",
    contentJson: null,
    fromAddress: "no-reply@acme.com",
    status: "DRAFT" as const,
    recipientScope: "all" as const,
    scheduledAt: null,
    sentAt: null,
    recipientCount: 0,
    sentCount: 0,
    failedCount: 0,
    workspaceId: "ws_1",
    createdById: "u_1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

  it("valida campanha sem destinatários", () => {
    expect(EmailCampaignOutputSchema.safeParse(dto).success).toBe(true);
  });

  it("valida campanha com lista de destinatários", () => {
    const parsed = EmailCampaignWithRecipientsSchema.safeParse({
      ...dto,
      recipients: [
        {
          id: "r_1",
          campaignId: "c_1",
          personId: null,
          email: "a@b.com",
          name: null,
          status: "PENDING",
          providerMessageId: null,
          errorMessage: null,
          sentAt: null,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
