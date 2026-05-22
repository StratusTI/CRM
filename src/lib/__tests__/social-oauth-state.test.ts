import { beforeAll, describe, expect, it } from "vitest";

type StateModule = typeof import("@/src/lib/social/oauth-state");
let createOauthState: StateModule["createOauthState"];
let verifyOauthState: StateModule["verifyOauthState"];

// `_server` lê BETTER_AUTH_SECRET no 1º import; testes unitários não carregam
// o .env, então definimos a chave antes do import dinâmico do módulo.
beforeAll(async () => {
  process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-0123456789";
  ({ createOauthState, verifyOauthState } = await import(
    "@/src/lib/social/oauth-state"
  ));
});

describe("oauth state", () => {
  it("verifica um state recém-criado e devolve o payload", () => {
    const state = createOauthState("acme", "INSTAGRAM");
    const result = verifyOauthState(state);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.slug).toBe("acme");
      expect(result.value.platform).toBe("INSTAGRAM");
      expect(result.value.exp).toBeGreaterThan(Date.now());
    }
  });

  it("rejeita assinatura adulterada", () => {
    const state = createOauthState("acme", "FACEBOOK");
    const [payload] = state.split(".");
    const forged = `${payload}.${Buffer.from("fake-signature").toString("base64url")}`;
    expect(verifyOauthState(forged).ok).toBe(false);
  });

  it("rejeita state com payload alterado (slug)", () => {
    const state = createOauthState("acme", "TIKTOK");
    const [, signature] = state.split(".");
    const tampered = Buffer.from(
      JSON.stringify({
        slug: "evil",
        platform: "TIKTOK",
        nonce: "x",
        exp: Date.now() + 1000,
      }),
    ).toString("base64url");
    expect(verifyOauthState(`${tampered}.${signature}`).ok).toBe(false);
  });

  it("rejeita formato malformado", () => {
    expect(verifyOauthState("garbage").ok).toBe(false);
    expect(verifyOauthState("").ok).toBe(false);
  });
});
