import type { Metadata } from "next";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { FormService } from "@/src/services/form.service";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await FormService.getPublicByToken(token);
  return { title: result.ok ? result.value.name : "Formulário" };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { token } = await params;
  const result = await FormService.getPublicByToken(token);

  if (!result.ok) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="font-semibold text-lg">Formulário indisponível</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          Este link pode ter sido despublicado ou não existe mais. Peça um novo
          link para quem compartilhou o formulário.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center px-6 py-12">
      <PublicFormRenderer form={result.value} token={token} />
    </main>
  );
}
