import { EmailCampaignComposer } from "@/components/email/email-campaign-composer";
import { PageShell } from "@/components/page-shell";

export default async function NewEmailCampaignPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return (
    <PageShell>
      <EmailCampaignComposer slug={slug} />
    </PageShell>
  );
}
