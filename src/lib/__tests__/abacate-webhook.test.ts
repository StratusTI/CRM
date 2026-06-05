import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSecret } = vi.hoisted(() => ({ getSecret: vi.fn() }));

vi.mock("@/src/lib/abacate/env", () => ({
  getAbacateWebhookSecret: getSecret,
}));

import { verifyAbacateWebhook } from "@/src/lib/abacate/webhook";

const SECRET = "super-secret-value";

describe("verifyAbacateWebhook", () => {
  beforeEach(() => {
    getSecret.mockReset();
    getSecret.mockReturnValue(SECRET);
  });

  it("rejeita quando o secret não está configurado no servidor", () => {
    getSecret.mockReturnValue(undefined);
    expect(verifyAbacateWebhook(SECRET)).toBe(false);
  });

  it("rejeita quando a query não traz o secret", () => {
    expect(verifyAbacateWebhook(null)).toBe(false);
    expect(verifyAbacateWebhook("")).toBe(false);
  });

  it("rejeita quando o secret da query não bate", () => {
    expect(verifyAbacateWebhook("errado")).toBe(false);
  });

  it("aceita quando o secret da query bate", () => {
    expect(verifyAbacateWebhook(SECRET)).toBe(true);
  });
});
