import { EmailCampaignDetail } from "@/components/email/email-campaign-detail";

export default async function EmailCampaignDetailPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return <EmailCampaignDetail slug={slug} id={id} />;
}
