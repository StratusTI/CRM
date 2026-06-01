import type { Metadata } from "next";
import { ProposalTracker } from "@/components/proposals/proposal-tracker";
import { ProposalViewer } from "@/components/proposals/proposal-viewer";
import { ProposalService } from "@/src/services/proposal.service";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await ProposalService.getPublicByToken(token);
  return { title: result.ok ? result.value.title : "Proposta" };
}

export default async function PublicProposalPage({ params }: PageProps) {
  const { token } = await params;
  const result = await ProposalService.getPublicByToken(token);

  if (!result.ok) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="font-semibold text-lg">Proposta indisponível</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          Este link pode ter sido despublicado ou não existe mais. Peça um novo
          link para quem compartilhou a proposta.
        </p>
      </main>
    );
  }

  const proposal = result.value;

  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl px-6 py-12 sm:py-16">
      <article>
        <h1 className="mb-6 text-balance font-semibold text-3xl tracking-tight">
          {proposal.title}
        </h1>
        <ProposalViewer content={proposal.content} />
      </article>
      <ProposalTracker token={token} />
    </main>
  );
}
