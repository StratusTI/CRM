"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useAcceptConsent } from "@/src/hooks/use-accept-consent";

export default function ConsentPage() {
  const { acceptConsent, isLoading, error } = useAcceptConsent();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    if (!terms || !privacy) return;
    await acceptConsent();
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Antes de continuar</CardTitle>
            <CardDescription>
              Precisamos do seu consentimento para criar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox
                    id="terms"
                    checked={terms}
                    onCheckedChange={(checked) => setTerms(checked === true)}
                  />
                  <FieldLabel htmlFor="terms">
                    Aceito os Termos de Uso
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="privacy"
                    checked={privacy}
                    onCheckedChange={(checked) => setPrivacy(checked === true)}
                  />
                  <FieldLabel htmlFor="privacy">
                    Aceito a Política de Privacidade
                  </FieldLabel>
                </Field>
                {error ? (
                  <FieldDescription className="text-destructive">
                    {error}
                  </FieldDescription>
                ) : null}
                <Field>
                  <Button
                    type="submit"
                    disabled={isLoading || !terms || !privacy}
                  >
                    {isLoading ? "Salvando..." : "Continuar"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
