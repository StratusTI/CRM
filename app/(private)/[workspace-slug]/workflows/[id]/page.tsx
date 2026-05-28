import { WorkflowEditor } from "@/components/workflows/workflow-editor";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return <WorkflowEditor slug={slug} workflowId={id} />;
}
