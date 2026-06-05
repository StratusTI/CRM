import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "@/src/lib/result";

const token = vi.hoisted(() => ({ getFreshAccessToken: vi.fn() }));
const client = vi.hoisted(() => ({
  fetchProfileOverview: vi.fn(),
  fetchRecentTweets: vi.fn(),
  publishTweet: vi.fn(),
}));

vi.mock("@/src/services/social-token", () => ({
  getFreshAccessToken: token.getFreshAccessToken,
}));
vi.mock("@/src/lib/social/twitter/client", () => client);

import { TwitterService } from "@/src/services/twitter.service";

function fresh(scope: string) {
  return ok({
    accessToken: "ACCESS",
    connection: { scope, externalAccountId: "acc_1" },
  });
}

beforeEach(() => {
  token.getFreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("TwitterService.getOverview", () => {
  it("propaga falha de token", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      err({ code: "SOCIAL_TOKEN_EXPIRED", message: "x" }),
    );
    const result = await TwitterService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_TOKEN_EXPIRED");
  });

  it("SOCIAL_SCOPE_MISSING sem users.read", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh(""));
    const result = await TwitterService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("chama o client com o token quando há escopo", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("users.read"));
    client.fetchProfileOverview.mockResolvedValue(ok({ id: "1" }));
    const result = await TwitterService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchProfileOverview).toHaveBeenCalledWith("ACCESS");
  });
});

describe("TwitterService.getRecentTweets", () => {
  it("passa o id externo ao client", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("tweet.read"));
    client.fetchRecentTweets.mockResolvedValue(ok({ tweets: [] }));
    const result = await TwitterService.getRecentTweets("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchRecentTweets).toHaveBeenCalledWith("ACCESS", "acc_1");
  });

  it("SOCIAL_SCOPE_MISSING sem tweet.read", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("users.read"));
    const result = await TwitterService.getRecentTweets("u1", "acme");
    expect(result.ok).toBe(false);
  });
});

describe("TwitterService.publishTweet", () => {
  it("exige tweet.write", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("tweet.read"));
    const result = await TwitterService.publishTweet(
      "u1",
      "acme",
      { text: "oi" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("encaminha texto e imagem ao client", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("tweet.write"));
    client.publishTweet.mockResolvedValue(ok({ id: "t1" }));
    const image = { bytes: new ArrayBuffer(4), contentType: "image/png" };
    const result = await TwitterService.publishTweet(
      "u1",
      "acme",
      { text: "olá" },
      image,
    );
    expect(result.ok).toBe(true);
    expect(client.publishTweet).toHaveBeenCalledWith("ACCESS", {
      text: "olá",
      image,
    });
  });
});
