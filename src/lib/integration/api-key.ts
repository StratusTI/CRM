import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Geração e verificação de chaves de API para ingestão server-to-server.
 *
 * O segredo é um token de alta entropia (`nexo_<base64url>`); por isso usamos
 * SHA-256 (e não bcrypt/argon) — não há o que reforçar num valor já aleatório.
 * O banco guarda só o hash; o texto puro é exibido uma única vez na geração.
 */

const TOKEN_PREFIX = "nexo_";
const TOKEN_BYTES = 32;
/** Quantos caracteres do token expomos como identificador legível da chave. */
const DISPLAY_PREFIX_LENGTH = TOKEN_PREFIX.length + 8;

export type GeneratedApiKey = {
  /** Texto puro — mostrar ao usuário só uma vez, nunca persistir. */
  token: string;
  /** Hash SHA-256 (hex) do token — é isso que vai pro banco. */
  hash: string;
  /** Prefixo legível para identificar a chave na UI (ex.: `nexo_a1b2c3d4`). */
  prefix: string;
};

/** Hash SHA-256 (hex) de um token. */
export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Gera um novo par token/hash + prefixo de exibição. */
export function generateApiKey(): GeneratedApiKey {
  const token = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    hash: hashApiKey(token),
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

/** Compara dois hashes hex em tempo constante. */
export function apiKeyHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Extrai o token do header Authorization. Aceita `Bearer <token>` (case
 * insensitive no esquema) ou o token cru. Retorna null se ausente/ vazio.
 */
export function parseApiKeyHeader(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  const match = /^bearer\s+(.+)$/i.exec(trimmed);
  const token = (match ? match[1] : trimmed).trim();
  return token.length > 0 ? token : null;
}
