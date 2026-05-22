"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";
import type { SignInInput, SignUpInput } from "@/src/schemas/auth.schema";

/** Página servidora que resolve a workspace e redireciona (email + Google). */
const POST_AUTH_PATH = "/post-auth";

type AuthClientError = { code?: string; message?: string } | null;

/** Mapeia códigos de erro do better-auth para mensagens em PT-BR. */
function mapAuthError(error: AuthClientError): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou senha incorretos.";
    case "USER_ALREADY_EXISTS":
      return "Já existe uma conta com este e-mail.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirme seu e-mail antes de entrar.";
    case "PASSWORD_TOO_SHORT":
      return "A senha é muito curta.";
    default:
      return error?.message ?? "Algo deu errado. Tente novamente.";
  }
}

export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(input: SignInInput): Promise<boolean> {
    setError(null);
    setIsLoading(true);
    const { error } = await authClient.signIn.email({
      email: input.email,
      password: input.password,
    });

    if (error) {
      setError(mapAuthError(error));
      setIsLoading(false);
      return false;
    }

    router.push(POST_AUTH_PATH);
    return true;
  }

  async function signUp(input: SignUpInput): Promise<boolean> {
    setError(null);
    setIsLoading(true);
    const { error } = await authClient.signUp.email({
      name: input.name,
      email: input.email,
      password: input.password,
    });

    if (error) {
      setError(mapAuthError(error));
      setIsLoading(false);
      return false;
    }

    router.push(POST_AUTH_PATH);
    return true;
  }

  async function signOut(): Promise<void> {
    setIsLoading(true);
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  async function signInWithGoogle(): Promise<void> {
    setError(null);
    setIsLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: POST_AUTH_PATH,
    });

    if (error) {
      setError(mapAuthError(error));
      setIsLoading(false);
    }
    // Em caso de sucesso o navegador é redirecionado para o Google,
    // então mantemos o loading ativo.
  }

  return { signIn, signUp, signInWithGoogle, signOut, isLoading, error };
}
