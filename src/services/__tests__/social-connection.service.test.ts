import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "@/src/lib/result";

const socialRepo = vi.hoisted(() => ({
  listByWorkspace: vi.fn(),
  findByWorkspaceAndPlatform: vi.fn(),
  upsertByPlatform: vi.fn(),
  deleteByPlatform: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
  listByUser: vi.fn(),
}));
const provider = vi.hoisted(() => ({
  platform: "INSTAGRAM" as const,
  isConfigured: vi.fn(() => true),
  buildAuthorizeUrl: vi.fn(() => "https://provider/authorize?x=1"),
  exchangeCode: vi.fn(),
  fetchAccount: vi.fn(),
}));
const oauthState = vi.hoisted(() => ({
  createOauthState: vi.fn(() => "signed-state"),
  verifyOauthState: vi.fn(),
}));

vi.mock("@/src/repositories/social-connection.repository", () => ({
  SocialConnectionRepository: socialRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/social/providers", () => ({
  getProvider: () => provider,
}));
vi.mock("@/src/lib/social/oauth-state", () => oauthState);
vi.mock("@/src/lib/social/crypto", () => ({
  encryptToken: (value: string) => `enc(${value})`,
  isTokenCryptoConfigured: () => true,
}));
vi.mock("@/src/lib/social/redirect", () => ({
  socialCallbackUrl: () => "https://app/api/social/callback/instagram",
}));

import { SocialConnectionService } from "@/src/services/social-connection.service";

const WORKSPACE_ID = "ws_1";

function memberOfWorkspace() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WORKSPACE_ID, slug: "acme" } }),
  );
}

beforeEach(() => {
  for (const fn of Object.values(socialRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
  provider.isConfigured.mockReturnValue(true);
  provider.buildAuthorizeUrl.mockReturnValue("https://provider/authorize?x=1");
  provider.exchangeCode.mockReset();
  provider.fetchAccount.mockReset();
  oauthState.createOauthState.mockReturnValue("signed-state");
  oauthState.verifyOauthState.mockReset();
});

describe("SocialConnectionService.disconnect", () => {
  it("retorna SOCIAL_CONNECTION_NOT_FOUND quando nada foi removido", async () => {
    memberOfWorkspace();
    socialRepo.deleteByPlatform.mockResolvedValue(ok(false));

    const result = await SocialConnectionService.disconnect(
      "u1",
      "acme",
      "INSTAGRAM",
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe("SOCIAL_CONNECTION_NOT_FOUND");
  });

  it("desconecta quando havia conexão", async () => {
    memberOfWorkspace();
    socialRepo.deleteByPlatform.mockResolvedValue(ok(true));

    const result = await SocialConnectionService.disconnect(
      "u1",
      "acme",
      "INSTAGRAM",
    );
    expect(result.ok).toBe(true);
  });
});

describe("SocialConnectionService.beginConnect", () => {
  it("falha com WORKSPACE_NOT_FOUND quando não é membro", async () => {
    memberRepo.findByUserAndSlug.mockResolvedValue(ok(null));

    const result = await SocialConnectionService.beginConnect(
      "u1",
      "acme",
      "INSTAGRAM",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WORKSPACE_NOT_FOUND");
  });

  it("falha com SOCIAL_PROVIDER_NOT_CONFIGURED quando faltam credenciais", async () => {
    memberOfWorkspace();
    provider.isConfigured.mockReturnValue(false);

    const result = await SocialConnectionService.beginConnect(
      "u1",
      "acme",
      "INSTAGRAM",
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe("SOCIAL_PROVIDER_NOT_CONFIGURED");
  });

  it("devolve a URL de autorização", async () => {
    memberOfWorkspace();
    const result = await SocialConnectionService.beginConnect(
      "u1",
      "acme",
      "INSTAGRAM",
    );
    expect(result.ok && result.value.authorizeUrl).toBe(
      "https://provider/authorize?x=1",
    );
  });
});

describe("SocialConnectionService.completeConnect", () => {
  it("rejeita state inválido", async () => {
    oauthState.verifyOauthState.mockReturnValue(err("invalid"));

    const result = await SocialConnectionService.completeConnect("u1", {
      platform: "INSTAGRAM",
      code: "code",
      state: "bad",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_STATE_INVALID");
  });

  it("rejeita quando a plataforma do callback diverge do state", async () => {
    oauthState.verifyOauthState.mockReturnValue(
      ok({ slug: "acme", platform: "FACEBOOK", nonce: "n", exp: Date.now() }),
    );

    const result = await SocialConnectionService.completeConnect("u1", {
      platform: "INSTAGRAM",
      code: "code",
      state: "s",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_STATE_INVALID");
  });

  it("cifra os tokens e faz upsert no caminho feliz", async () => {
    oauthState.verifyOauthState.mockReturnValue(
      ok({ slug: "acme", platform: "INSTAGRAM", nonce: "n", exp: Date.now() }),
    );
    memberOfWorkspace();
    provider.exchangeCode.mockResolvedValue(
      ok({
        accessToken: "ACCESS",
        refreshToken: "REFRESH",
        expiresAt: null,
        scope: "scope",
      }),
    );
    provider.fetchAccount.mockResolvedValue(
      ok({ externalId: "ig-1", name: "@acme" }),
    );
    socialRepo.upsertByPlatform.mockResolvedValue(ok({ id: "c1" }));

    const result = await SocialConnectionService.completeConnect("u1", {
      platform: "INSTAGRAM",
      code: "code",
      state: "s",
    });

    expect(result.ok && result.value.slug).toBe("acme");
    expect(socialRepo.upsertByPlatform).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        platform: "INSTAGRAM",
        accessToken: "enc(ACCESS)",
        refreshToken: "enc(REFRESH)",
        externalAccountId: "ig-1",
        accountName: "@acme",
      }),
    );
  });

  it("persiste o token de sub-conta quando fetchAccount devolve override (Facebook Page)", async () => {
    oauthState.verifyOauthState.mockReturnValue(
      ok({ slug: "acme", platform: "FACEBOOK", nonce: "n", exp: Date.now() }),
    );
    memberOfWorkspace();
    provider.exchangeCode.mockResolvedValue(
      ok({
        accessToken: "USER_TOKEN",
        refreshToken: null,
        expiresAt: null,
        scope: "pages_manage_posts",
      }),
    );
    const pageExpiry = new Date("2026-08-01T00:00:00.000Z");
    provider.fetchAccount.mockResolvedValue(
      ok({
        externalId: "page-1",
        name: "Acme Page",
        accessTokenOverride: {
          accessToken: "PAGE_TOKEN",
          expiresAt: pageExpiry,
        },
      }),
    );
    socialRepo.upsertByPlatform.mockResolvedValue(ok({ id: "c1" }));

    const result = await SocialConnectionService.completeConnect("u1", {
      platform: "FACEBOOK",
      code: "code",
      state: "s",
    });

    expect(result.ok).toBe(true);
    expect(socialRepo.upsertByPlatform).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "FACEBOOK",
        externalAccountId: "page-1",
        accessToken: "enc(PAGE_TOKEN)",
        tokenExpiresAt: pageExpiry,
      }),
    );
  });

  it("propaga falha da troca do code", async () => {
    oauthState.verifyOauthState.mockReturnValue(
      ok({ slug: "acme", platform: "INSTAGRAM", nonce: "n", exp: Date.now() }),
    );
    memberOfWorkspace();
    provider.exchangeCode.mockResolvedValue(
      err({ code: "SOCIAL_OAUTH_FAILED", message: "x" }),
    );

    const result = await SocialConnectionService.completeConnect("u1", {
      platform: "INSTAGRAM",
      code: "code",
      state: "s",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_OAUTH_FAILED");
    expect(socialRepo.upsertByPlatform).not.toHaveBeenCalled();
  });
});
