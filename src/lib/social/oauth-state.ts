import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { BETTER_AUTH_SECRET } from "@/lib/env/_server";
import { err, ok, type Result } from "@/src/lib/result";
import {
  type SocialPlatform,
  SocialPlatformSchema,
} from "@/src/schemas/social-connection.schema";

/**
 * `state` do OAuth: protege o callback contra CSRF e carrega o workspace
 * (o callback é um path fixo, então o slug viaja aqui). Stateless: assinado
 * por HMAC-SHA256 com `BETTER_AUTH_SECRET`, com expiração curta.
 *
 * Formato: `<payloadBase64url>.<assinaturaBase64url>`.
 */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 min

type StatePayload = {
  slug: string;
  platform: SocialPlatform;
  nonce: string;
  exp: number;
};

function sign(payloadB64: string): string {
  return createHmac("sha256", BETTER_AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");
}

/** Cria um `state` assinado para a plataforma/workspace informados. */
export function createOauthState(
  slug: string,
  platform: SocialPlatform,
): string {
  const payload: StatePayload = {
    slug,
    platform,
    nonce: randomBytes(16).toString("base64url"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verifica assinatura e expiração, devolvendo o payload. `Result` para que o
 * service mapeie falha → `socialStateInvalid` sem distinguir o motivo ao cliente.
 */
export function verifyOauthState(
  state: string,
): Result<StatePayload, "invalid"> {
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) return err("invalid");

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return err("invalid");

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return err("invalid");
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return err("invalid");
  }
  if (!SocialPlatformSchema.safeParse(payload.platform).success) {
    return err("invalid");
  }
  if (typeof payload.slug !== "string" || payload.slug.length === 0) {
    return err("invalid");
  }

  return ok(payload);
}
