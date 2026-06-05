import { LeadsTable } from "@/components/tables/leads-table";

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <LeadsTable slug={slug} />;
}
