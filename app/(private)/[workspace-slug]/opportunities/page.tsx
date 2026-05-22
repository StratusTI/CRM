import { OpportunitiesTable } from "@/components/tables/opportunities-table";

export default async function OpportunitiesPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <OpportunitiesTable slug={slug} />;
}
