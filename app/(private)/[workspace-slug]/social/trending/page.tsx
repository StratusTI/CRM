import { TrendingFeed } from "@/components/social/trending-feed";

export default async function TrendingPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <TrendingFeed slug={slug} />;
}
