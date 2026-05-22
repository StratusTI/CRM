import { z } from "zod";

/**
 * Contrato da feature User (perfil + LGPD).
 * better-auth continua dono de email/senha/sessão; aqui só campos de domínio.
 */

export const UpdateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome").max(120).optional(),
    image: z.url("URL de imagem inválida").nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.image !== undefined, {
    message: "Nenhum campo para atualizar",
  });

/** Consentimento LGPD: ambos os aceites são obrigatórios e devem ser `true`. */
export const AcceptConsentSchema = z.object({
  acceptTerms: z.literal(true, {
    error: "É necessário aceitar os termos de uso",
  }),
  acceptPrivacy: z.literal(true, {
    error: "É necessário aceitar a política de privacidade",
  }),
});

export const UserOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  acceptedTermsAt: z.string().nullable(),
  acceptedPrivacyAt: z.string().nullable(),
  deletionScheduledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AcceptConsentInput = z.infer<typeof AcceptConsentSchema>;
export type UserDTO = z.infer<typeof UserOutputSchema>;
