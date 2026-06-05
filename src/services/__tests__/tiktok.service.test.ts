import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const token = vi.hoisted(() => ({ getFreshAccessToken: vi.fn() }));
const client = vi.hoisted(() => ({
  fetchCreatorOverview: vi.fn(),
  fetchVideos: vi.fn(),
  publishVideo: vi.fn(),
}));

vi.mock("@/src/services/social-token", () => ({
  getFreshAccessToken: token.getFreshAccessToken,
}));
vi.mock("@/src/lib/social/tiktok/client", () => client);

import { TiktokService } from "@/src/services/tiktok.service";

function fresh(scope: string) {
  return ok({
    accessToken: "ACCESS",
    connection: { scope, externalAccountId: "open_1" },
  });
}

beforeEach(() => {
  token.getFreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("TiktokService.getOverview", () => {
  it("SOCIAL_SCOPE_MISSING sem user.info.stats", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh(""));
    const result = await TiktokService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("busca o overview do criador", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("user.info.stats"));
    client.fetchCreatorOverview.mockResolvedValue(ok({ openId: "1" }));
    const result = await TiktokService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchCreatorOverview).toHaveBeenCalledWith("ACCESS");
  });
});

describe("TiktokService.getVideos", () => {
  it("exige video.list", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("user.info.stats"));
    const result = await TiktokService.getVideos("u1", "acme");
    expect(result.ok).toBe(false);
  });

  it("lista vídeos quando há escopo", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("video.list"));
    client.fetchVideos.mockResolvedValue(ok({ videos: [] }));
    const result = await TiktokService.getVideos("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchVideos).toHaveBeenCalledWith("ACCESS");
  });
});

describe("TiktokService.publishVideo", () => {
  it("exige video.publish", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("video.list"));
    const result = await TiktokService.publishVideo(
      "u1",
      "acme",
      {
        title: "t",
        privacyLevel: "SELF_ONLY",
        disableComment: false,
        disableDuet: false,
        disableStitch: false,
      },
      { bytes: new ArrayBuffer(8), contentType: "video/mp4" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("encaminha arquivo e opções ao client", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("video.publish"));
    client.publishVideo.mockResolvedValue(ok({ publishId: "p1", status: "x" }));
    const file = { bytes: new ArrayBuffer(8), contentType: "video/mp4" };
    const result = await TiktokService.publishVideo(
      "u1",
      "acme",
      {
        title: "Meu vídeo",
        privacyLevel: "PUBLIC_TO_EVERYONE",
        disableComment: true,
        disableDuet: false,
        disableStitch: true,
      },
      file,
    );
    expect(result.ok).toBe(true);
    expect(client.publishVideo).toHaveBeenCalledWith(
      "ACCESS",
      expect.objectContaining({
        file,
        title: "Meu vídeo",
        privacyLevel: "PUBLIC_TO_EVERYONE",
        disableComment: true,
        disableStitch: true,
      }),
    );
  });
});
