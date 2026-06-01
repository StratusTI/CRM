import { ProposalEditor } from "@/components/proposals/proposal-editor";

export default async function ProposalEditorPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return <ProposalEditor slug={slug} proposalId={id} />;
}
