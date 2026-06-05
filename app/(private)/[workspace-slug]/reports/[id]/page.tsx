import { ReportBuilder } from "@/components/reports/report-builder";

export default async function ReportBuilderPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return <ReportBuilder slug={slug} reportId={id} />;
}
