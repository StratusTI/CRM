import { z } from "zod";

/**
 * Contrato público dos formulários de autenticação.
 * O backend de auth (sessões, hashing, OAuth, persistência) é do better-auth;
 * estes schemas só validam o input do cliente antes de chamar o `authClient`.
 */

export const SignInSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const SignUpSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome").max(120),
    email: z.email("E-mail inválido"),
    password: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres")
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
