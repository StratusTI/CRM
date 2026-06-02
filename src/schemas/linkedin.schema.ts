import { z } from "zod";

/**
 * Contratos da integração com o LinkedIn (conta free / OAuth 2.0 básico).
 * Escopos: r_liteprofile, r_emailaddress, w_member_social.
 * Insights avançados (impressões, engajamento) exigem LinkedIn Marketing Partner —
 * o overview exibe apenas dados de perfil disponíveis no tier free.
 */

/** Perfil conectado: dados disponíveis via r_liteprofile + userinfo. */
export const LinkedInOverviewSchema = z.object({
  personId: z.string(),
  name: z.string().nullable(),
  headline: z.string().nullable(),
  email: z.string().nullable(),
  picture: z.string().nullable(),
});

export type LinkedInOverview = z.infer<typeof LinkedInOverviewSchema>;

/** Conteúdo de um post publicado via w_member_social. */
export const LinkedInPublishInputSchema = z.object({
  text: z.string().min(1).max(3000),
});

export type LinkedInPublishInput = z.infer<typeof LinkedInPublishInputSchema>;

/** Resposta de publicação — o URN do post criado. */
export const LinkedInPublishOutputSchema = z.object({
  postUrn: z.string(),
});

export type LinkedInPublishOutput = z.infer<typeof LinkedInPublishOutputSchema>;
