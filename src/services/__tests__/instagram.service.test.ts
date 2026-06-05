import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const token = vi.hoisted(() => ({ getFreshAccessToken: vi.fn() }));
const client = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  fetchInsights: vi.fn(),
  fetchRecentMedia: vi.fn(),
  publishPost: vi.fn(),
}));
const blob = vi.hoisted(() => ({ putBlob: vi.fn(), removeBlob: vi.fn() }));

vi.mock("@/src/services/social-token", () => ({
  getFreshAccessToken: token.getFreshAccessToken,
}));
vi.mock("@/src/lib/social/instagram/client", () => client);
vi.mock("@/src/lib/social/blob-store", () => blob);
vi.mock("@/lib/env/_server", () => ({ BETTER_AUTH_URL: "https://app.test" }));

import { InstagramService } from "@/src/services/instagram.service";

function fresh(scope: string, externalAccountId = "ig_1") {
  return ok({
    accessToken: "ACCESS",
    connection: { scope, externalAccountId },
  });
}

beforeEach(() => {
  token.getFreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
  blob.putBlob.mockReset();
  blob.removeBlob.mockReset();
});

describe("InstagramService.getOverview", () => {
  it("SOCIAL_SCOPE_MISSING sem instagram_basic", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh(""));
    const result = await InstagramService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("busca o perfil com o id externo", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("instagram_basic"));
    client.fetchProfile.mockResolvedValue(ok({ igAccountId: "ig_1" }));
    const result = await InstagramService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchProfile).toHaveBeenCalledWith("ACCESS", "ig_1");
  });
});

describe("InstagramService.getInsights", () => {
  it("exige instagram_manage_insights e traduz a janela", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("instagram_basic,instagram_manage_insights"),
    );
    client.fetchInsights.mockResolvedValue(ok({ series: [] }));
    const result = await InstagramService.getInsights("u1", "acme", "7d");
    expect(result.ok).toBe(true);
    const [, , opts] = client.fetchInsights.mock.calls[0];
    expect(opts.range).toBe("7d");
    expect(opts.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("InstagramService.getRecentMedia", () => {
  it("lista mídias recentes", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("instagram_basic"));
    client.fetchRecentMedia.mockResolvedValue(ok({ media: [] }));
    const result = await InstagramService.getRecentMedia("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchRecentMedia).toHaveBeenCalledWith("ACCESS", "ig_1");
  });
});

describe("InstagramService.publishPost", () => {
  const input = { caption: "oi", postType: "feed" } as never;

  it("exige instagram_content_publish", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("instagram_basic"));
    const result = await InstagramService.publishPost("u1", "acme", input, {
      bytes: new ArrayBuffer(8),
      contentType: "image/png",
      kind: "IMAGE",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("hospeda blob, publica imagem e remove blob no fim", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("instagram_content_publish"),
    );
    blob.putBlob.mockReturnValue("blob-token");
    client.publishPost.mockResolvedValue(ok({ postId: "1", permalink: null }));
    const result = await InstagramService.publishPost("u1", "acme", input, {
      bytes: new ArrayBuffer(8),
      contentType: "image/png",
      kind: "IMAGE",
    });
    expect(result.ok).toBe(true);
    expect(blob.putBlob).toHaveBeenCalled();
    expect(client.publishPost).toHaveBeenCalledWith(
      "ACCESS",
      "ig_1",
      expect.objectContaining({
        caption: "oi",
        imageUrl: "https://app.test/api/social/blob/blob-token",
        videoUrl: null,
      }),
    );
    expect(blob.removeBlob).toHaveBeenCalledWith("blob-token");
  });

  it("remove o blob mesmo se o publish lançar", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("instagram_content_publish"),
    );
    blob.putBlob.mockReturnValue("blob-token");
    client.publishPost.mockRejectedValue(new Error("falhou"));
    await expect(
      InstagramService.publishPost("u1", "acme", input, {
        bytes: new ArrayBuffer(8),
        contentType: "video/mp4",
        kind: "VIDEO",
      }),
    ).rejects.toThrow("falhou");
    expect(blob.removeBlob).toHaveBeenCalledWith("blob-token");
  });
});
