"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/src/hooks/use-auth";
import { SignUpSchema } from "@/src/schemas/auth.schema";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const { signUp, signInWithGoogle, isLoading, error } = useAuth();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = SignUpSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirm-password"),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await signUp(parsed.data);
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Criar uma conta</CardTitle>
        <CardDescription>
          Preencha seus dados abaixo para criar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nome completo</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="João Silva"
                autoComplete="name"
                required
              />
              {fieldErrors.name ? (
                <FieldDescription className="text-destructive">
                  {fieldErrors.name}
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email ? (
                <FieldDescription className="text-destructive">
                  {fieldErrors.email}
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Usaremos este email para entrar em contato. Não
                  compartilharemos seu email com ninguém.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              {fieldErrors.password ? (
                <FieldDescription className="text-destructive">
                  {fieldErrors.password}
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Deve ter pelo menos 8 caracteres.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirmar senha
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
              />
              {fieldErrors.confirmPassword ? (
                <FieldDescription className="text-destructive">
                  {fieldErrors.confirmPassword}
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Por favor, confirme sua senha.
                </FieldDescription>
              )}
            </Field>
            {error ? (
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            ) : null}
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading}
                  onClick={() => signInWithGoogle()}
                >
                  Cadastrar com Google
                </Button>
                <FieldDescription className="px-6 text-center">
                  Já tem uma conta? <Link href="/sign-in">Entrar</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
