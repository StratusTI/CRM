import { redirect } from "next/navigation";

export default async function MarketingIndex({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  redirect(`/${slug}/marketing/campaigns`);
}
