import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@/src/lib/result";

const token = vi.hoisted(() => ({ getFreshAccessToken: vi.fn() }));
const client = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  publishPost: vi.fn(),
}));

vi.mock("@/src/services/social-token", () => ({
  getFreshAccessToken: token.getFreshAccessToken,
}));
vi.mock("@/src/lib/social/linkedin/client", () => client);

import { LinkedInService } from "@/src/services/linkedin.service";

function fresh(scope: string, externalAccountId = "person_1") {
  return ok({
    accessToken: "ACCESS",
    connection: { scope, externalAccountId },
  });
}

beforeEach(() => {
  token.getFreshAccessToken.mockReset();
  for (const fn of Object.values(client)) fn.mockReset();
});

describe("LinkedInService.getOverview", () => {
  it("SOCIAL_SCOPE_MISSING sem r_liteprofile", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh(""));
    const result = await LinkedInService.getOverview("u1", "acme");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("busca o perfil quando há escopo", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("r_liteprofile"));
    client.fetchProfile.mockResolvedValue(ok({ personId: "1" }));
    const result = await LinkedInService.getOverview("u1", "acme");
    expect(result.ok).toBe(true);
    expect(client.fetchProfile).toHaveBeenCalledWith("ACCESS");
  });
});

describe("LinkedInService.publish", () => {
  it("exige w_member_social", async () => {
    token.getFreshAccessToken.mockResolvedValue(fresh("r_liteprofile"));
    const result = await LinkedInService.publish("u1", "acme", { text: "oi" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SOCIAL_SCOPE_MISSING");
  });

  it("SOCIAL_CONNECTION_NOT_FOUND quando o personId é unknown", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("w_member_social", "unknown"),
    );
    const result = await LinkedInService.publish("u1", "acme", { text: "oi" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SOCIAL_CONNECTION_NOT_FOUND");
    }
  });

  it("publica usando o URN do autor", async () => {
    token.getFreshAccessToken.mockResolvedValue(
      fresh("w_member_social", "abc"),
    );
    client.publishPost.mockResolvedValue(ok({ postUrn: "urn:li:share:1" }));
    const result = await LinkedInService.publish("u1", "acme", { text: "olá" });
    expect(result.ok).toBe(true);
    expect(client.publishPost).toHaveBeenCalledWith(
      "ACCESS",
      "urn:li:person:abc",
      "olá",
      undefined,
    );
  });
});
