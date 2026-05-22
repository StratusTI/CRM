import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

// A chave precisa existir antes de importar o módulo (lê do env na 1ª chamada).
beforeAll(() => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("social crypto (AES-256-GCM)", () => {
  it("faz round-trip de encrypt/decrypt", async () => {
    const { encryptToken, decryptToken } = await import(
      "@/src/lib/social/crypto"
    );
    const secret = "ya29.super-secret-access-token";
    const cipher = encryptToken(secret);

    expect(cipher).not.toContain(secret);
    expect(cipher.split(".")).toHaveLength(3);
    expect(decryptToken(cipher)).toBe(secret);
  });

  it("gera ciphertext diferente a cada chamada (IV aleatório)", async () => {
    const { encryptToken } = await import("@/src/lib/social/crypto");
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("rejeita ciphertext adulterado (auth tag)", async () => {
    const { encryptToken, decryptToken } = await import(
      "@/src/lib/social/crypto"
    );
    const cipher = encryptToken("token");
    const [iv, , data] = cipher.split(".");
    const tampered = `${iv}.${Buffer.from("xx").toString("base64")}.${data}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("isTokenCryptoConfigured reflete a presença da chave", async () => {
    const { isTokenCryptoConfigured } = await import("@/src/lib/social/crypto");
    expect(isTokenCryptoConfigured()).toBe(true);
  });
});
