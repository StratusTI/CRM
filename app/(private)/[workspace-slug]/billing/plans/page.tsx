import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlanSelection } from "@/components/billing/plan-selection";
import { PageShell } from "@/components/page-shell";
import { getAuthSession } from "@/src/lib/auth-session";
import { SubscriptionService } from "@/src/services/subscription.service";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;

  const session = await getAuthSession();
  if (!session.ok) redirect("/sign-in");

  // getCurrent é owner-only: não-owner/não-membro → erro → 404 (oculta a página).
  const current = await SubscriptionService.getCurrent(
    session.value.user.id,
    slug,
  );
  if (!current.ok) notFound();

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-3">
          <Link
            href={`/${slug}/billing`}
            className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
            Voltar para o billing
          </Link>
          <div className="space-y-1">
            <h1 className="font-heading font-semibold text-xl tracking-tight">
              Planos
            </h1>
            <p className="text-muted-foreground text-sm">
              Escolha o plano ideal para o tamanho da sua equipe. Cobrança
              mensal ou anual (20% de desconto).
            </p>
          </div>
        </div>

        <PlanSelection slug={slug} current={current.value} />
      </section>
    </PageShell>
  );
}
