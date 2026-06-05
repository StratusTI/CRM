import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const campaignRepo = vi.hoisted(() => ({
  createWithRecipients: vi.fn(),
  findByIdWithRecipients: vi.fn(),
  listByWorkspace: vi.fn(),
  updateStatus: vi.fn(),
  updateRecipient: vi.fn(),
}));
const mailingRepo = vi.hoisted(() => ({ getMembersByListIds: vi.fn() }));
const memberRepo = vi.hoisted(() => ({ findByUserAndSlug: vi.fn() }));
const prismaMock = vi.hoisted(() => ({
  person: { findMany: vi.fn() },
}));
const resendMock = vi.hoisted(() => ({
  getResendClient: vi.fn(),
  getFromAddress: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/src/repositories/email-campaign.repository", () => ({
  EmailCampaignRepository: campaignRepo,
}));
vi.mock("@/src/repositories/mailing-list.repository", () => ({
  MailingListRepository: mailingRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/src/lib/resend", () => ({
  getResendClient: resendMock.getResendClient,
  getFromAddress: resendMock.getFromAddress,
}));

import { EmailCampaignService } from "@/src/services/email-campaign.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function campaign(recipients: Record<string, unknown>[]) {
  return {
    id: "c_1",
    subject: "Promo",
    contentHtml: "<p>oi</p>",
    contentJson: null,
    fromAddress: "no-reply@acme.com",
    status: "SENDING",
    recipientScope: "ALL",
    scheduledAt: null,
    sentAt: null,
    workspaceId: WS,
    createdById: "user_1",
    createdAt: D,
    updatedAt: D,
    recipients,
  };
}

function recipient(overrides: Record<string, unknown> = {}) {
  return {
    id: "r_1",
    campaignId: "c_1",
    personId: null,
    email: "a@b.com",
    name: "Ana",
    status: "PENDING",
    providerMessageId: null,
    errorMessage: null,
    sentAt: null,
    createdAt: D,
    updatedAt: D,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS } }),
  );
}

function configureProvider() {
  resendMock.getResendClient.mockReturnValue({
    emails: { send: resendMock.send },
  });
  resendMock.getFromAddress.mockReturnValue("no-reply@acme.com");
}

beforeEach(() => {
  for (const fn of Object.values(campaignRepo)) fn.mockReset();
  mailingRepo.getMembersByListIds.mockReset();
  memberRepo.findByUserAndSlug.mockReset();
  prismaMock.person.findMany.mockReset();
  resendMock.getResendClient.mockReset();
  resendMock.getFromAddress.mockReset();
  resendMock.send.mockReset();
});

describe("EmailCampaignService.createAndSend", () => {
  it("EMAIL_PROVIDER_NOT_CONFIGURED quando provedor ausente", async () => {
    asMember();
    resendMock.getResendClient.mockReturnValue(null);
    resendMock.getFromAddress.mockReturnValue(null);
    const result = await EmailCampaignService.createAndSend("user_1", "acme", {
      subject: "S",
      contentHtml: "<p></p>",
      recipientScope: "all",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMAIL_PROVIDER_NOT_CONFIGURED");
    }
  });

  it("EMAIL_NO_RECIPIENTS quando nenhum email válido", async () => {
    asMember();
    configureProvider();
    prismaMock.person.findMany.mockResolvedValue([]);
    const result = await EmailCampaignService.createAndSend("user_1", "acme", {
      subject: "S",
      contentHtml: "<p></p>",
      recipientScope: "all",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("EMAIL_NO_RECIPIENTS");
  });

  it("envia imediatamente e marca SENT, deduplicando emails", async () => {
    asMember();
    configureProvider();
    prismaMock.person.findMany.mockResolvedValue([
      { id: "p_1", name: "Ana", emails: ["a@b.com", "A@B.com"] },
    ]);
    campaignRepo.createWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ personId: "p_1" })])),
    );
    campaignRepo.updateRecipient.mockResolvedValue(ok(recipient()));
    campaignRepo.updateStatus.mockResolvedValue(ok({}));
    campaignRepo.findByIdWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ status: "SENT" })])),
    );
    resendMock.send.mockResolvedValue({ data: { id: "msg-1" }, error: null });

    const result = await EmailCampaignService.createAndSend("user_1", "acme", {
      subject: "Promo",
      contentHtml: "<p>oi</p>",
      recipientScope: "all",
    });
    expect(result.ok).toBe(true);
    // só um destinatário (dedupe a@b.com)
    const seeds = campaignRepo.createWithRecipients.mock.calls[0][1];
    expect(seeds).toHaveLength(1);
    // status final SENT
    expect(campaignRepo.updateStatus).toHaveBeenCalledWith(
      "c_1",
      "SENT",
      expect.any(Date),
    );
  });

  it("marca FAILED quando todos os envios falham", async () => {
    asMember();
    configureProvider();
    prismaMock.person.findMany.mockResolvedValue([
      { id: "p_1", name: "Ana", emails: ["a@b.com"] },
    ]);
    campaignRepo.createWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ personId: "p_1" })])),
    );
    campaignRepo.updateRecipient.mockResolvedValue(ok(recipient()));
    campaignRepo.updateStatus.mockResolvedValue(ok({}));
    campaignRepo.findByIdWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ status: "FAILED" })])),
    );
    resendMock.send.mockResolvedValue({
      data: null,
      error: { message: "rejeitado" },
    });

    const result = await EmailCampaignService.createAndSend("user_1", "acme", {
      subject: "Promo",
      contentHtml: "<p>oi</p>",
      recipientScope: "all",
    });
    expect(result.ok).toBe(true);
    expect(campaignRepo.updateStatus).toHaveBeenCalledWith(
      "c_1",
      "FAILED",
      null,
    );
    expect(campaignRepo.updateRecipient).toHaveBeenCalledWith(
      "r_1",
      expect.objectContaining({ status: "FAILED" }),
    );
  });

  it("trata exceção do provedor como falha do destinatário", async () => {
    asMember();
    configureProvider();
    prismaMock.person.findMany.mockResolvedValue([
      { id: "p_1", name: null, emails: ["a@b.com"] },
    ]);
    campaignRepo.createWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ name: null })])),
    );
    campaignRepo.updateRecipient.mockResolvedValue(ok(recipient()));
    campaignRepo.updateStatus.mockResolvedValue(ok({}));
    campaignRepo.findByIdWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ status: "FAILED" })])),
    );
    resendMock.send.mockRejectedValue(new Error("timeout"));

    const result = await EmailCampaignService.createAndSend("user_1", "acme", {
      subject: "Promo",
      contentHtml: "<p>oi</p>",
      recipientScope: "all",
    });
    expect(result.ok).toBe(true);
    expect(campaignRepo.updateRecipient).toHaveBeenCalledWith(
      "r_1",
      expect.objectContaining({ status: "FAILED", errorMessage: "timeout" }),
    );
  });

  it("inclui membros de mailing list e emails avulsos", async () => {
    asMember();
    configureProvider();
    prismaMock.person.findMany.mockResolvedValue([]);
    mailingRepo.getMembersByListIds.mockResolvedValue(
      ok([{ email: "list@x.com", name: "L", personId: null }]),
    );
    campaignRepo.createWithRecipients.mockResolvedValue(
      ok(campaign([recipient()])),
    );
    campaignRepo.updateRecipient.mockResolvedValue(ok(recipient()));
    campaignRepo.updateStatus.mockResolvedValue(ok({}));
    campaignRepo.findByIdWithRecipients.mockResolvedValue(
      ok(campaign([recipient({ status: "SENT" })])),
    );
    resendMock.send.mockResolvedValue({ data: { id: "m" }, error: null });

    const result = await EmailCampaignService.createAndSend("user_1", "acme", {
      subject: "Promo",
      contentHtml: "<p>oi</p>",
      recipientScope: "selected",
      mailingListIds: ["l_1"],
      extraEmails: ["avulso@x.com"],
    });
    expect(result.ok).toBe(true);
    const seeds = campaignRepo.createWithRecipients.mock.calls[0][1];
    expect(seeds.map((s: { email: string }) => s.email)).toEqual(
      expect.arrayContaining(["list@x.com", "avulso@x.com"]),
    );
  });
});

describe("EmailCampaignService.getById", () => {
  it("EMAIL_CAMPAIGN_NOT_FOUND para outra workspace", async () => {
    asMember();
    campaignRepo.findByIdWithRecipients.mockResolvedValue(
      ok({ ...campaign([]), workspaceId: "ws_2" }),
    );
    const result = await EmailCampaignService.getById("user_1", "acme", "c_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("EMAIL_CAMPAIGN_NOT_FOUND");
  });

  it("retorna a campanha com destinatários", async () => {
    asMember();
    campaignRepo.findByIdWithRecipients.mockResolvedValue(
      ok(campaign([recipient()])),
    );
    const result = await EmailCampaignService.getById("user_1", "acme", "c_1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.recipients).toHaveLength(1);
  });
});

describe("EmailCampaignService.list", () => {
  it("mapeia campanhas com contagem de status", async () => {
    asMember();
    campaignRepo.listByWorkspace.mockResolvedValue(
      ok([campaign([recipient({ status: "SENT" })])]),
    );
    const result = await EmailCampaignService.list("user_1", "acme");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].sentCount).toBe(1);
    }
  });
});
