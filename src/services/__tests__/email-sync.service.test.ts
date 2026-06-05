import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const client = vi.hoisted(() => ({
  provider: "GOOGLE" as const,
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  listEvents: vi.fn(),
  createEvent: vi.fn(),
}));
const msgRepo = vi.hoisted(() => ({
  createIfNew: vi.fn(),
  create: vi.fn(),
}));
const eventRepo = vi.hoisted(() => ({ createIfNew: vi.fn() }));
const accountRepo = vi.hoisted(() => ({
  markSynced: vi.fn(),
  updateTokens: vi.fn(),
}));
const personRepo = vi.hoisted(() => ({ findByEmailOrPhone: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/email-sync", () => ({ getMailClient: () => client }));
vi.mock("@/src/lib/social/crypto", () => ({
  isTokenCryptoConfigured: () => true,
  encryptToken: (v: string) => `enc(${v})`,
  decryptToken: (v: string) => v.replace(/^enc\(|\)$/g, ""),
}));
vi.mock("@/src/repositories/email-message.repository", () => ({
  EmailMessageRepository: msgRepo,
  CalendarEventRepository: eventRepo,
}));
vi.mock("@/src/repositories/email-account.repository", () => ({
  EmailAccountRepository: accountRepo,
}));
vi.mock("@/src/repositories/person.repository", () => ({
  PersonRepository: personRepo,
}));
vi.mock("@/src/services/activity-recorder", () => ({ recordActivity }));

import { EmailSyncService } from "@/src/services/email-sync.service";

const account = {
  id: "acc_1",
  workspaceId: "ws_1",
  userId: "user_1",
  provider: "GOOGLE" as const,
  email: "me@acme.com",
  accessToken: "enc(token-123)",
  refreshToken: null,
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  scope: null,
  lastSyncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  for (const fn of Object.values(client)) {
    if (typeof fn === "function") (fn as ReturnType<typeof vi.fn>).mockReset();
  }
  msgRepo.createIfNew.mockReset().mockResolvedValue(ok(true));
  msgRepo.create.mockReset().mockResolvedValue(ok({ id: "m1" }));
  eventRepo.createIfNew.mockReset().mockResolvedValue(ok(true));
  accountRepo.markSynced.mockReset().mockResolvedValue(ok(true));
  personRepo.findByEmailOrPhone.mockReset();
  recordActivity.mockReset();
  client.listEvents.mockResolvedValue(ok([]));
});

describe("EmailSyncService.importAccount", () => {
  it("importa mensagens, casa contato e registra atividade", async () => {
    client.listMessages.mockResolvedValue(
      ok([
        {
          externalId: "g1",
          threadId: "t1",
          subject: "Olá",
          snippet: "...",
          fromEmail: "lead@cliente.com",
          toEmails: ["me@acme.com"],
          sentAt: new Date(),
        },
      ]),
    );
    personRepo.findByEmailOrPhone.mockResolvedValue(ok({ id: "person_9" }));

    const result = await EmailSyncService.importAccount(account);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imported).toBe(1);
      expect(result.value.matched).toBe(1);
    }
    // direção INBOUND (remetente != conta) e personId vinculado
    const write = msgRepo.createIfNew.mock.calls[0][0];
    expect(write.direction).toBe("INBOUND");
    expect(write.personId).toBe("person_9");
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(accountRepo.markSynced).toHaveBeenCalledWith("acc_1");
  });

  it("não registra atividade quando não casa contato", async () => {
    client.listMessages.mockResolvedValue(
      ok([
        {
          externalId: "g2",
          threadId: null,
          subject: null,
          snippet: null,
          fromEmail: "estranho@x.com",
          toEmails: ["me@acme.com"],
          sentAt: new Date(),
        },
      ]),
    );
    personRepo.findByEmailOrPhone.mockResolvedValue(ok(null));

    const result = await EmailSyncService.importAccount(account);
    expect(result.ok && result.value.matched).toBe(0);
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("ignora duplicatas (createIfNew false não conta)", async () => {
    client.listMessages.mockResolvedValue(
      ok([
        {
          externalId: "dup",
          threadId: null,
          subject: null,
          snippet: null,
          fromEmail: "x@x.com",
          toEmails: [],
          sentAt: new Date(),
        },
      ]),
    );
    personRepo.findByEmailOrPhone.mockResolvedValue(ok(null));
    msgRepo.createIfNew.mockResolvedValue(ok(false)); // já existia

    const result = await EmailSyncService.importAccount(account);
    expect(result.ok && result.value.imported).toBe(0);
  });
});

describe("EmailSyncService.sendEmail", () => {
  it("envia pelo client e persiste como OUTBOUND", async () => {
    client.sendMessage.mockResolvedValue(ok("sent-1"));
    personRepo.findByEmailOrPhone.mockResolvedValue(ok({ id: "p_to" }));

    const result = await EmailSyncService.sendEmail(account, {
      to: ["dest@x.com"],
      subject: "Oi",
      body: "corpo",
    });
    expect(result.ok).toBe(true);
    const write = msgRepo.create.mock.calls[0][0];
    expect(write.direction).toBe("OUTBOUND");
    expect(write.fromEmail).toBe("me@acme.com");
    expect(write.personId).toBe("p_to");
  });
});
