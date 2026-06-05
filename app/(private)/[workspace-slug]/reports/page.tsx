import { ReportsTable } from "@/components/reports/reports-table";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <ReportsTable slug={slug} />;
}
