import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const socialRepo = vi.hoisted(() => ({
  findByWorkspaceAndPlatform: vi.fn(),
  updateTokens: vi.fn(),
  updateStatus: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({ findByUserAndSlug: vi.fn() }));
const provider = vi.hoisted(() => ({
  platform: "FACEBOOK" as const,
  isConfigured: vi.fn(() => true),
  // Facebook não tem refresh — propositalmente sem refreshAccessToken.
}));
const client = vi.hoisted(() => ({
  fetchPageOverview: vi.fn(),
  fetchInsights: vi.fn(),
  publishPost: vi.fn(),
}));

vi.mock("@/src/repositories/social-connection.repository", () => ({
  SocialConnectionRepository: socialRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/social/providers", () => ({ getProvider: () => provider }));
vi.mock("@/src/lib/social/facebook/client", () => client);
vi.mock("@/src/lib/social/crypto", () => ({
  encryptToken: (v: string) => `enc(${v})`,
  decryptToken: (v: string) => v.replace(/^enc\(|\)$/g, ""),
  isTokenCryptoConfigured: () => true,
}));

import { FacebookService } from "@/src/services/facebook.service";

const WORKSPACE_ID = "ws_1";
const ALL_SCOPES =
  "public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,read_insights";

function memberOfWorkspace() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WORKSPACE_ID, slug: "acme" } }),
  );
}

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    platform: "FACEBOOK",
    externalAccountId: "page-1",
    accessToken: "enc(PAGE_TOKEN)",
    refreshToken: null,
    tokenExpiresAt: null, // Page token longo não expira
    scope: ALL_SCOPES,
    status: "CONNECTED",
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(socialRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("FacebookService.getOverview", () => {
  it("chama o cliente com o Page token e o page id", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(connection()));
    client.fetchPageOverview.mockResolvedValue(ok({ pageId: "page-1" }));

    const result = await FacebookService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchPageOverview).toHaveBeenCalledWith(
      "PAGE_TOKEN",
      "page-1",
    );
  });

  it("falha com SOCIAL_CONNECTION_NOT_FOUND quando não há conexão", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(null));

    const result = await FacebookService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe("SOCIAL_CONNECTION_NOT_FOUND");
  });

  it("exige reconexão quando falta escopo de leitura", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ scope: "public_profile" })),
    );

    const result = await FacebookService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("token de Página expirado sem refresh → SOCIAL_TOKEN_EXPIRED (reconectar)", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ tokenExpiresAt: new Date(Date.now() - 1000) })),
    );

    const result = await FacebookService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_TOKEN_EXPIRED");
  });
});

describe("FacebookService.publishPost", () => {
  it("exige escopo de publicação", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ scope: "pages_read_engagement" })),
    );

    const result = await FacebookService.publishPost(
      "u1",
      "acme",
      { message: "oi", link: null },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("encaminha mensagem/link/imagem para o cliente", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(connection()));
    client.publishPost.mockResolvedValue(ok({ postId: "p1", url: "u" }));

    const image = { bytes: new ArrayBuffer(4), contentType: "image/png" };
    const result = await FacebookService.publishPost(
      "u1",
      "acme",
      { message: "Olá", link: "https://x.com" },
      image,
    );
    expect(result.ok).toBe(true);
    expect(client.publishPost).toHaveBeenCalledWith("PAGE_TOKEN", "page-1", {
      message: "Olá",
      link: "https://x.com",
      image,
    });
  });
});
