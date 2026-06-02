import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { BillingSection } from "@/components/settings/billing-section";
import { getAuthSession } from "@/src/lib/auth-session";
import { MembershipRepository } from "@/src/repositories/membership.repository";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;

  const session = await getAuthSession();
  if (!session.ok) redirect("/sign-in");

  const membership = await MembershipRepository.findByUserAndSlug(
    session.value.user.id,
    slug,
  );
  if (!membership.ok || !membership.value) notFound();

  return (
    <PageShell>
      <BillingSection slug={slug} />
    </PageShell>
  );
}
