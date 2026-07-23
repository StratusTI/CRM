import { CompetitorsTable } from "@/components/tables/competitors-table";

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <CompetitorsTable slug={slug} />;
}
