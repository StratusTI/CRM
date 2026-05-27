import { BETTER_AUTH_URL } from "@/lib/env/_server";
import {
  platformToSlug,
  type SocialPlatform,
} from "@/src/schemas/social-connection.schema";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * URL de callback OAuth registrada nos painéis dos provedores. É um path FIXO
 * (sem o slug da workspace) porque os provedores exigem redirect URIs exatas e
 * pré-cadastradas — o workspace viaja no `state`. Precisa ser idêntica entre a
 * autorização e a troca do code, por isso é derivada de um único ponto.
 *
 * Inclui `BASE_PATH` (em prod = `/crm`) porque o `BETTER_AUTH_URL` é só origin
 * — o Next 16.2.6 não strippa basePath em runtime, então o usuário (e portanto
 * o provedor OAuth) precisa visitar `/crm/api/social/callback/...` pro Apache
 * conseguir proxar de volta pro container.
 */
export function socialCallbackUrl(platform: SocialPlatform): string {
  const base = BETTER_AUTH_URL.replace(/\/$/, "");
  return `${base}${BASE_PATH}/api/social/callback/${platformToSlug(platform)}`;
}
