import { BETTER_AUTH_URL } from "@/lib/env/_server";
import {
  platformToSlug,
  type SocialPlatform,
} from "@/src/schemas/social-connection.schema";

/**
 * URL de callback OAuth registrada nos painéis dos provedores. É um path FIXO
 * (sem o slug da workspace) porque os provedores exigem redirect URIs exatas e
 * pré-cadastradas — o workspace viaja no `state`. Precisa ser idêntica entre a
 * autorização e a troca do code, por isso é derivada de um único ponto.
 */
export function socialCallbackUrl(platform: SocialPlatform): string {
  const base = BETTER_AUTH_URL.replace(/\/$/, "");
  return `${base}/api/social/callback/${platformToSlug(platform)}`;
}
