import { LandingPagesTable } from "@/components/tables/landing-pages-table";

export default async function LandingPagesPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <LandingPagesTable slug={slug} />;
}
