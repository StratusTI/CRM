import { WorkflowsTable } from "@/components/workflows/workflows-table";

export default async function WorkflowsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <WorkflowsTable slug={slug} />;
}
