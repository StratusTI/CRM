import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const keyRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findActiveByHash: vi.fn(),
  listByWorkspace: vi.fn(),
  touchLastUsed: vi.fn(),
  revoke: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));

vi.mock("@/src/repositories/integration-api-key.repository", () => ({
  IntegrationApiKeyRepository: keyRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));

import { hashApiKey } from "@/src/lib/integration/api-key";
import { IntegrationApiKeyService } from "@/src/services/integration-api-key.service";

const WS = "ws_1";
const D = new Date("2026-01-01T00:00:00.000Z");

function key(overrides: Record<string, unknown> = {}) {
  return {
    id: "k_1",
    name: "CI",
    keyHash: "hash",
    prefix: "nx_abc",
    workspaceId: WS,
    createdById: "user_1",
    lastUsedAt: null,
    revokedAt: null,
    createdAt: D,
    ...overrides,
  };
}

function asMember() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WS } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(keyRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
});

describe("IntegrationApiKeyService.create", () => {
  it("gera token de uso único e nunca persiste o texto puro", async () => {
    asMember();
    keyRepo.create.mockResolvedValue(ok(key()));
    const result = await IntegrationApiKeyService.create("user_1", "acme", {
      name: "CI",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.token).toEqual(expect.any(String));
      expect(result.value.token.length).toBeGreaterThan(16);
    }
    const args = keyRepo.create.mock.calls[0][0];
    expect(args.keyHash).toEqual(expect.any(String));
    expect(args).not.toHaveProperty("token");
  });
});

describe("IntegrationApiKeyService.revoke", () => {
  it("INTEGRATION_KEY_NOT_FOUND para outra workspace", async () => {
    asMember();
    keyRepo.findById.mockResolvedValue(ok(key({ workspaceId: "ws_2" })));
    const result = await IntegrationApiKeyService.revoke(
      "user_1",
      "acme",
      "k_1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INTEGRATION_KEY_NOT_FOUND");
    expect(keyRepo.revoke).not.toHaveBeenCalled();
  });

  it("revoga quando na workspace", async () => {
    asMember();
    keyRepo.findById.mockResolvedValue(ok(key()));
    keyRepo.revoke.mockResolvedValue(ok(key({ revokedAt: D })));
    const result = await IntegrationApiKeyService.revoke(
      "user_1",
      "acme",
      "k_1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.revokedAt).not.toBeNull();
  });
});

describe("IntegrationApiKeyService.authenticate", () => {
  it("INTEGRATION_KEY_INVALID sem header", async () => {
    const result = await IntegrationApiKeyService.authenticate(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INTEGRATION_KEY_INVALID");
  });

  it("INTEGRATION_KEY_INVALID quando o hash não casa", async () => {
    keyRepo.findActiveByHash.mockResolvedValue(ok(null));
    const result = await IntegrationApiKeyService.authenticate(
      "Bearer nx_inexistente",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INTEGRATION_KEY_INVALID");
  });

  it("resolve contexto e carimba uso quando válido", async () => {
    const token = "nx_token_valido";
    keyRepo.findActiveByHash.mockResolvedValue(ok(key()));
    keyRepo.touchLastUsed.mockResolvedValue(undefined);
    const result = await IntegrationApiKeyService.authenticate(
      `Bearer ${token}`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspaceId).toBe(WS);
      expect(result.value.actorUserId).toBe("user_1");
    }
    expect(keyRepo.findActiveByHash).toHaveBeenCalledWith(hashApiKey(token));
    expect(keyRepo.touchLastUsed).toHaveBeenCalledWith("k_1");
  });
});
