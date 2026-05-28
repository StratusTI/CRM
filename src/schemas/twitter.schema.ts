import { z } from "zod";

/**
 * Contratos da integração com o Twitter/X (sobre a conexão social já existente).
 * Escopo dentro do tier gratuito da API do X: ver o perfil (overview, via
 * `GET /2/users/me`) e publicar um tweet (`POST /2/tweets`, texto + imagem
 * opcional). Ler timeline/métricas/analytics é paywall (Basic+), por isso fica
 * fora — o overview expõe só identidade, sem contadores.
 */

/** Visão do perfil: só identidade (métricas exigem plano pago). */
export const TwitterProfileOverviewSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
});

export type TwitterProfileOverview = z.infer<
  typeof TwitterProfileOverviewSchema
>;

/**
 * Conteúdo do tweet. A imagem (opcional) NÃO entra aqui — vem como `File` no
 * `multipart/form-data` e é validada na rota; este schema valida só o texto.
 * Limite de 280 chars da API do X.
 */
export const PublishTweetSchema = z.object({
  text: z.string().trim().min(1, "O tweet não pode ficar vazio").max(280),
});

export type PublishTweetInput = z.infer<typeof PublishTweetSchema>;

/** Resultado da publicação — id do tweet e link para abri-lo. */
export const PublishTweetResultSchema = z.object({
  tweetId: z.string(),
  permalink: z.string().nullable(),
});

export type PublishTweetResult = z.infer<typeof PublishTweetResultSchema>;
