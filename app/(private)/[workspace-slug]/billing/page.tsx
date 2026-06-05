import { notFound, redirect } from "next/navigation";
import { PlanSummaryCard } from "@/components/billing/plan-summary-card";
import { PageShell } from "@/components/page-shell";
import { BillingSection } from "@/components/settings/billing-section";
import { getAuthSession } from "@/src/lib/auth-session";
import { SubscriptionService } from "@/src/services/subscription.service";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;

  const session = await getAuthSession();
  if (!session.ok) redirect("/sign-in");

  // Pagamentos/planos são visíveis somente ao OWNER. getCurrent é owner-only:
  // não-owner/não-membro → erro → 404 (oculta a página inteira de billing).
  const current = await SubscriptionService.getCurrent(
    session.value.user.id,
    slug,
  );
  if (!current.ok) notFound();

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <h2 className="font-heading font-semibold text-lg tracking-tight">
            Plano e cobrança
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie seu plano e acompanhe o consumo do assistente de IA.
          </p>
        </div>
        <PlanSummaryCard slug={slug} subscription={current.value} />
      </section>
      <BillingSection slug={slug} />
    </PageShell>
  );
}
