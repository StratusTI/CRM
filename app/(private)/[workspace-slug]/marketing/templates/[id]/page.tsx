import { EmailTemplateEditorLoader } from "@/components/email/email-template-editor-loader";
import { PageShell } from "@/components/page-shell";

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return (
    <PageShell>
      <EmailTemplateEditorLoader slug={slug} id={id} />
    </PageShell>
  );
}
