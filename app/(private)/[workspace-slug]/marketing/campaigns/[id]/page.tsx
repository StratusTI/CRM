import { redirect } from "next/navigation";

export default async function EmailCampaignDetailPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug } = await params;
  redirect(`/${slug}/marketing/campaigns`);
}
