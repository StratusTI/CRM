import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "@/src/lib/result";

const socialRepo = vi.hoisted(() => ({
  findByWorkspaceAndPlatform: vi.fn(),
  updateTokens: vi.fn(),
  updateStatus: vi.fn(),
}));
const memberRepo = vi.hoisted(() => ({
  findByUserAndSlug: vi.fn(),
}));
const provider = vi.hoisted(() => ({
  platform: "YOUTUBE" as const,
  isConfigured: vi.fn(() => true),
  refreshAccessToken: vi.fn(),
}));
const client = vi.hoisted(() => ({
  fetchChannelOverview: vi.fn(),
  fetchInsights: vi.fn(),
  uploadVideo: vi.fn(),
}));

vi.mock("@/src/repositories/social-connection.repository", () => ({
  SocialConnectionRepository: socialRepo,
}));
vi.mock("@/src/repositories/membership.repository", () => ({
  MembershipRepository: memberRepo,
}));
vi.mock("@/src/lib/social/providers", () => ({ getProvider: () => provider }));
vi.mock("@/src/lib/social/youtube/client", () => client);
vi.mock("@/src/lib/social/crypto", () => ({
  encryptToken: (v: string) => `enc(${v})`,
  decryptToken: (v: string) => v.replace(/^enc\(|\)$/g, ""),
  isTokenCryptoConfigured: () => true,
}));

import { YoutubeService } from "@/src/services/youtube.service";

const WORKSPACE_ID = "ws_1";
const ALL_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.upload";

function memberOfWorkspace() {
  memberRepo.findByUserAndSlug.mockResolvedValue(
    ok({ id: "m1", workspace: { id: WORKSPACE_ID, slug: "acme" } }),
  );
}

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    platform: "YOUTUBE",
    accessToken: "enc(ACCESS)",
    refreshToken: "enc(REFRESH)",
    tokenExpiresAt: new Date(Date.now() + 3_600_000), // 1h no futuro
    scope: ALL_SCOPES,
    status: "CONNECTED",
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(socialRepo)) fn.mockReset();
  for (const fn of Object.values(memberRepo)) fn.mockReset();
  provider.refreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("YoutubeService.getOverview", () => {
  it("falha com SOCIAL_CONNECTION_NOT_FOUND quando não há conexão", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(null));

    const result = await YoutubeService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_CONNECTION_NOT_FOUND");
  });

  it("usa o token vigente quando não expirou e chama o cliente", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(connection()));
    client.fetchChannelOverview.mockResolvedValue(ok({ channelId: "UC1" }));

    const result = await YoutubeService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchChannelOverview).toHaveBeenCalledWith("ACCESS");
    expect(provider.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("exige reconexão (SOCIAL_SCOPE_MISSING) quando falta o escopo de leitura", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ scope: "" })),
    );

    const result = await YoutubeService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("renova e persiste o token quando expirado", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ tokenExpiresAt: new Date(Date.now() - 1000) })),
    );
    provider.refreshAccessToken.mockResolvedValue(
      ok({
        accessToken: "NEW_ACCESS",
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3_600_000),
        scope: ALL_SCOPES,
      }),
    );
    socialRepo.updateTokens.mockResolvedValue(ok(connection()));
    client.fetchChannelOverview.mockResolvedValue(ok({ channelId: "UC1" }));

    const result = await YoutubeService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(provider.refreshAccessToken).toHaveBeenCalledWith("REFRESH");
    expect(socialRepo.updateTokens).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ accessToken: "enc(NEW_ACCESS)" }),
    );
    expect(client.fetchChannelOverview).toHaveBeenCalledWith("NEW_ACCESS");
  });

  it("marca EXPIRED e falha quando o refresh é recusado", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ tokenExpiresAt: new Date(Date.now() - 1000) })),
    );
    provider.refreshAccessToken.mockResolvedValue(
      err({ code: "SOCIAL_OAUTH_FAILED", message: "x" }),
    );
    socialRepo.updateStatus.mockResolvedValue(ok(connection()));

    const result = await YoutubeService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_TOKEN_EXPIRED");
    expect(socialRepo.updateStatus).toHaveBeenCalledWith("c1", "EXPIRED");
  });

  it("falha com SOCIAL_TOKEN_EXPIRED quando expirou e não há refresh token", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(
        connection({
          tokenExpiresAt: new Date(Date.now() - 1000),
          refreshToken: null,
        }),
      ),
    );

    const result = await YoutubeService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_TOKEN_EXPIRED");
  });
});

describe("YoutubeService.getInsights", () => {
  it("pede a série com a janela traduzida em datas", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(connection()));
    client.fetchInsights.mockResolvedValue(ok({ series: [] }));

    const result = await YoutubeService.getInsights("u1", "acme", "7d");
    expect(result.ok).toBe(true);
    expect(client.fetchInsights).toHaveBeenCalledWith(
      "ACCESS",
      expect.objectContaining({ range: "7d" }),
    );
  });
});

describe("YoutubeService.publishVideo", () => {
  it("exige escopo de upload", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(
      ok(connection({ scope: "https://www.googleapis.com/auth/youtube.readonly" })),
    );

    const result = await YoutubeService.publishVideo(
      "u1",
      "acme",
      { title: "t", description: "", privacyStatus: "private", tags: [] },
      { bytes: new ArrayBuffer(8), contentType: "video/mp4" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("encaminha o arquivo e metadados para o cliente", async () => {
    memberOfWorkspace();
    socialRepo.findByWorkspaceAndPlatform.mockResolvedValue(ok(connection()));
    client.uploadVideo.mockResolvedValue(ok({ videoId: "v1" }));

    const bytes = new ArrayBuffer(8);
    const result = await YoutubeService.publishVideo(
      "u1",
      "acme",
      { title: "Meu vídeo", description: "desc", privacyStatus: "public", tags: ["a"] },
      { bytes, contentType: "video/mp4" },
    );
    expect(result.ok).toBe(true);
    expect(client.uploadVideo).toHaveBeenCalledWith(
      "ACCESS",
      expect.objectContaining({
        title: "Meu vídeo",
        privacyStatus: "public",
        tags: ["a"],
        file: { bytes, contentType: "video/mp4" },
      }),
    );
  });
});
