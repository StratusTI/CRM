import { DashboardCanvas } from "@/components/dashboards/dashboard-canvas";

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return <DashboardCanvas slug={slug} dashboardId={id} />;
}
