import { EmailCampaignsList } from "@/components/email/email-campaigns-list";

export default async function EmailCampaignsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <EmailCampaignsList slug={slug} />;
}
