import { DashboardsTable } from "@/components/tables/dashboards-table";

export default async function DashboardsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <DashboardsTable slug={slug} />;
}
