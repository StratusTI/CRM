import { ProposalsTable } from "@/components/tables/proposals-table";

export default async function ProposalsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <ProposalsTable slug={slug} />;
}
