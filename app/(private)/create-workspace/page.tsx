"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
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
import { useCreateWorkspace } from "@/src/hooks/use-create-workspace";
import { CreateWorkspaceSchema } from "@/src/schemas/workspace.schema";

export default function WorkspaceCreationPage() {
  const { createWorkspace, isLoading, error } = useCreateWorkspace();
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = CreateWorkspaceSchema.safeParse({
      name: formData.get("name"),
    });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Nome inválido");
      return;
    }

    setFieldError(null);
    await createWorkspace(parsed.data);
  };

  return (
    <AuthShell tagline="Dê o primeiro passo no seu novo CRM.">
      <Card>
        <CardHeader>
          <CardTitle>Crie sua workspace</CardTitle>
          <CardDescription>
            Dê um nome ao espaço onde seu time vai trabalhar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nome da workspace</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Acme Inc."
                  autoComplete="organization"
                  required
                />
                {fieldError ? (
                  <FieldDescription className="text-destructive">
                    {fieldError}
                  </FieldDescription>
                ) : (
                  <FieldDescription>
                    O endereço (slug) é gerado a partir do nome.
                  </FieldDescription>
                )}
              </Field>
              {error ? (
                <FieldDescription className="text-destructive">
                  {error}
                </FieldDescription>
              ) : null}
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar workspace"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
