import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSecret } = vi.hoisted(() => ({ getSecret: vi.fn() }));

vi.mock("@/src/lib/abacate/env", () => ({
  getAbacateWebhookSecret: getSecret,
}));

import { verifyAbacateWebhook } from "@/src/lib/abacate/webhook";

const SECRET = "super-secret-value";
const BODY = '{"event":"billing.paid","id":"evt_1"}';

function hmac(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

describe("verifyAbacateWebhook", () => {
  beforeEach(() => {
    getSecret.mockReset();
    getSecret.mockReturnValue(SECRET);
  });

  it("rejeita quando o secret não está configurado", () => {
    getSecret.mockReturnValue(undefined);
    expect(
      verifyAbacateWebhook({
        rawBody: BODY,
        querySecret: SECRET,
        signature: null,
        timestamp: null,
      }),
    ).toBe(false);
  });

  it("rejeita quando o secret da query não bate", () => {
    expect(
      verifyAbacateWebhook({
        rawBody: BODY,
        querySecret: "errado",
        signature: null,
        timestamp: null,
      }),
    ).toBe(false);
  });

  it("aceita com o secret da query correto e sem assinatura HMAC", () => {
    expect(
      verifyAbacateWebhook({
        rawBody: BODY,
        querySecret: SECRET,
        signature: null,
        timestamp: null,
      }),
    ).toBe(true);
  });

  it("aceita com assinatura HMAC válida e timestamp recente", () => {
    const now = Math.floor(Date.now() / 1000).toString();
    expect(
      verifyAbacateWebhook({
        rawBody: BODY,
        querySecret: SECRET,
        signature: hmac(BODY, SECRET),
        timestamp: now,
      }),
    ).toBe(true);
  });

  it("rejeita assinatura HMAC inválida", () => {
    expect(
      verifyAbacateWebhook({
        rawBody: BODY,
        querySecret: SECRET,
        signature: hmac(BODY, "outro-secret"),
        timestamp: Math.floor(Date.now() / 1000).toString(),
      }),
    ).toBe(false);
  });

  it("rejeita timestamp expirado (replay)", () => {
    const old = (Math.floor(Date.now() / 1000) - 600).toString();
    expect(
      verifyAbacateWebhook({
        rawBody: BODY,
        querySecret: SECRET,
        signature: hmac(BODY, SECRET),
        timestamp: old,
      }),
    ).toBe(false);
  });
});
