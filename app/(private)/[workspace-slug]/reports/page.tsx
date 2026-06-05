import { ReportsBoard } from "@/components/reports/reports-board";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <ReportsBoard slug={slug} />;
}
